/**
 * Test equating and linking module
 */

import { calculateICC } from '../utils/irt.js';
import type { 
  EquatingConfiguration, 
  EquatingResults,
  LinkingCoefficients,
  ConversionTableEntry,
  EquatingError,
  AnchorDiagnostics
} from '../types/index.js';

interface FormParameters {
  form_id: string;
  item_parameters: { [itemId: string]: ItemParams };
  theta_distribution?: { mean: number; sd: number };
}

interface ItemParams {
  discrimination: number;
  difficulty: number;
  se_discrimination?: number;
  se_difficulty?: number;
}

/**
 * Run equating analysis
 */
export async function runEquating(
  config: EquatingConfiguration,
  formData: FormParameters[]
): Promise<EquatingResults> {
  
  switch (config.method) {
    case 'concurrent':
      return runConcurrentCalibration(config, formData);
    case 'separate_linking':
      return runSeparateLinking(config, formData);
    case 'fipc':
      return runFIPC(config, formData);
    default:
      throw new Error(`Equating method ${config.method} not implemented`);
  }
}

/**
 * Concurrent calibration (all forms estimated together)
 */
async function runConcurrentCalibration(
  config: EquatingConfiguration,
  formData: FormParameters[]
): Promise<EquatingResults> {
  
  if (formData.length < 2) {
    throw new Error('Concurrent calibration requires at least two forms');
  }
  const [baseForm, targetForm] = formData;
  if (!baseForm || !targetForm) {
    throw new Error('Concurrent calibration requires at least two forms');
  }

  // In concurrent calibration, parameters are already on same scale
  const linkingCoefficients: LinkingCoefficients = {
    slope: 1.0,
    intercept: 0.0,
    slope_se: 0.0,
    intercept_se: 0.0
  };

  const conversionTable = generateConversionTable(
    baseForm,
    targetForm,
    linkingCoefficients
  );

  const equatingError = computeEquatingError(conversionTable);

  const anchorDiagnostics = config.sensitivity_analysis
    ? await performAnchorDiagnostics(config, formData)
    : undefined;

  return {
    method: config.method,
    linking_coefficients: linkingCoefficients,
    conversion_table: conversionTable,
    equating_error: equatingError,
    ...(anchorDiagnostics ? { anchor_diagnostics: anchorDiagnostics } : {})
  };
}

/**
 * Separate calibration with linking
 */
async function runSeparateLinking(
  config: EquatingConfiguration,
  formData: FormParameters[]
): Promise<EquatingResults> {
  
  const baseForm = formData.find(f => f.form_id === config.base_form);
  const targetForm = formData.find(f => f.form_id === config.target_forms[0]);

  if (!baseForm || !targetForm) {
    throw new Error('Base form or target form not found');
  }

  // Compute linking coefficients based on anchor items
  const linkingCoefficients = computeLinkingCoefficients(
    baseForm,
    targetForm,
    config.anchor_items,
    config.linking_method || 'mean_mean'
  );

  const conversionTable = generateConversionTable(
    baseForm,
    targetForm,
    linkingCoefficients
  );

  const equatingError = computeEquatingError(conversionTable, config.compute_se);

  const anchorDiagnostics = config.sensitivity_analysis
    ? await performAnchorDiagnostics(config, formData)
    : undefined;

  return {
    method: config.method,
    linking_coefficients: linkingCoefficients,
    conversion_table: conversionTable,
    equating_error: equatingError,
    ...(anchorDiagnostics ? { anchor_diagnostics: anchorDiagnostics } : {})
  };
}

/**
 * Fixed Item Parameter Calibration (FIPC)
 */
async function runFIPC(
  config: EquatingConfiguration,
  formData: FormParameters[]
): Promise<EquatingResults> {
  
  const baseForm = formData.find(f => f.form_id === config.base_form);
  const targetForm = formData.find(f => f.form_id === config.target_forms[0]);

  if (!baseForm || !targetForm) {
    throw new Error('Base form or target form not found');
  }

  // In FIPC, anchor item parameters are fixed from base form
  // Only theta distribution of target group is estimated
  const linkingCoefficients: LinkingCoefficients = {
    slope: 1.0,  // Items already on base scale
    intercept: targetForm.theta_distribution?.mean || 0.0,
    slope_se: 0.0,
    intercept_se: targetForm.theta_distribution?.sd ? 
      targetForm.theta_distribution.sd / Math.sqrt(100) : 0.1  // Placeholder SE
  };

  const conversionTable = generateConversionTable(
    baseForm,
    targetForm,
    linkingCoefficients
  );

  const equatingError = computeEquatingError(conversionTable, config.compute_se);

  return {
    method: config.method,
    linking_coefficients: linkingCoefficients,
    conversion_table: conversionTable,
    equating_error: equatingError
  };
}

/**
 * Compute linking coefficients using various methods
 */
function computeLinkingCoefficients(
  baseForm: FormParameters,
  targetForm: FormParameters,
  anchorItems: string[],
  method: string
): LinkingCoefficients {
  
  switch (method) {
    case 'mean_mean':
      return meanMeanLinking(baseForm, targetForm, anchorItems);
    case 'mean_sigma':
      return meanSigmaLinking(baseForm, targetForm, anchorItems);
    case 'stocking_lord':
      return stockingLordLinking(baseForm, targetForm, anchorItems);
    case 'haebara':
      return haebaraLinking(baseForm, targetForm, anchorItems);
    default:
      throw new Error(`Linking method ${method} not implemented`);
  }
}

/**
 * Mean/Mean linking (difficulty parameters)
 */
function meanMeanLinking(
  baseForm: FormParameters,
  targetForm: FormParameters,
  anchorItems: string[]
): LinkingCoefficients {
  
  let sumBase = 0;
  let sumTarget = 0;
  let count = 0;

  anchorItems.forEach(itemId => {
    const baseItem = baseForm.item_parameters[itemId];
    const targetItem = targetForm.item_parameters[itemId];
    
    if (baseItem && targetItem) {
      sumBase += baseItem.difficulty;
      sumTarget += targetItem.difficulty;
      count++;
    }
  });

  if (count === 0) {
    throw new Error('No matching anchor items found between forms');
  }

  const meanBase = sumBase / count;
  const meanTarget = sumTarget / count;

  return {
    slope: 1.0,
    intercept: meanBase - meanTarget,
    slope_se: 0.1,  // Placeholder
    intercept_se: 0.2  // Placeholder
  };
}

/**
 * Mean/Sigma linking (both discrimination and difficulty)
 */
function meanSigmaLinking(
  baseForm: FormParameters,
  targetForm: FormParameters,
  anchorItems: string[]
): LinkingCoefficients {
  
  const difficulties = { base: [] as number[], target: [] as number[] };
  const discriminations = { base: [] as number[], target: [] as number[] };

  anchorItems.forEach(itemId => {
    const baseItem = baseForm.item_parameters[itemId];
    const targetItem = targetForm.item_parameters[itemId];
    
    if (baseItem && targetItem) {
      difficulties.base.push(baseItem.difficulty);
      difficulties.target.push(targetItem.difficulty);
      discriminations.base.push(baseItem.discrimination);
      discriminations.target.push(targetItem.discrimination);
    }
  });

  if (difficulties.base.length === 0) {
    throw new Error('No matching anchor items found between forms');
  }

  const meanDiffBase = mean(difficulties.base);
  const meanDiffTarget = mean(difficulties.target);
  const sdDiscBase = standardDeviation(discriminations.base);
  const sdDiscTarget = standardDeviation(discriminations.target);

  if (sdDiscTarget === 0) {
    throw new Error('Target form anchor discrimination SD is zero; cannot compute linking slope');
  }

  const slope = sdDiscBase / sdDiscTarget;
  const intercept = meanDiffBase - slope * meanDiffTarget;

  return {
    slope,
    intercept,
    slope_se: 0.1,  // Placeholder
    intercept_se: 0.2  // Placeholder
  };
}

/**
 * Stocking-Lord linking (minimize characteristic curve differences)
 */
function stockingLordLinking(
  baseForm: FormParameters,
  targetForm: FormParameters,
  anchorItems: string[]
): LinkingCoefficients {
  
  const initial = meanSigmaLinking(baseForm, targetForm, anchorItems);
  const anchorPairs = getAnchorPairs(baseForm, targetForm, anchorItems);
  if (anchorPairs.length === 0) {
    return initial;
  }

  const thetaGrid = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
  const objective = (slope: number, intercept: number): number => {
    let sumSq = 0;
    thetaGrid.forEach(theta => {
      const thetaTarget = slope * theta + intercept;
      anchorPairs.forEach(({ base, target }) => {
        const baseP = calculateICC(theta, base.discrimination, base.difficulty);
        const targetP = calculateICC(thetaTarget, target.discrimination, target.difficulty);
        const diff = baseP - targetP;
        sumSq += diff * diff;
      });
    });
    return sumSq;
  };

  return optimizeLinkingCoefficients(initial, objective);
}

/**
 * Haebara linking (minimize test characteristic curve differences)
 */
function haebaraLinking(
  baseForm: FormParameters,
  targetForm: FormParameters,
  anchorItems: string[]
): LinkingCoefficients {
  
  const initial = meanSigmaLinking(baseForm, targetForm, anchorItems);
  const anchorPairs = getAnchorPairs(baseForm, targetForm, anchorItems);
  if (anchorPairs.length === 0) {
    return initial;
  }

  const thetaGrid = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
  const objective = (slope: number, intercept: number): number => {
    let sumSq = 0;
    thetaGrid.forEach(theta => {
      const thetaTarget = slope * theta + intercept;
      const baseTcc = anchorPairs.reduce(
        (sum, pair) => sum + calculateICC(theta, pair.base.discrimination, pair.base.difficulty),
        0
      );
      const targetTcc = anchorPairs.reduce(
        (sum, pair) => sum + calculateICC(thetaTarget, pair.target.discrimination, pair.target.difficulty),
        0
      );
      const diff = baseTcc - targetTcc;
      sumSq += diff * diff;
    });
    return sumSq;
  };

  return optimizeLinkingCoefficients(initial, objective);
}

/**
 * Generate conversion table
 */
function generateConversionTable(
  baseForm: FormParameters,
  targetForm: FormParameters,
  linking: LinkingCoefficients
): ConversionTableEntry[] {
  
  const table: ConversionTableEntry[] = [];
  const thetaRange = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
  const baseItems = Object.values(baseForm.item_parameters);
  const targetItems = Object.values(targetForm.item_parameters);
  if (baseItems.length === 0 || targetItems.length === 0) {
    throw new Error('Equating requires item parameters for both base and target forms');
  }
  const expectedScore = (theta: number, items: ItemParams[]): number => {
    return items.reduce((sum, item) => {
      return sum + calculateICC(theta, item.discrimination, item.difficulty);
    }, 0);
  };

  thetaRange.forEach(theta => {
    // Transform theta to target scale
    const thetaTarget = linking.slope * theta + linking.intercept;
    
    // Compute expected scores based on item response functions
    const rawScore = expectedScore(theta, baseItems);
    const equatedScore = expectedScore(thetaTarget, targetItems);
    
    table.push({
      raw_score: Math.round(rawScore),
      theta: theta,
      equated_score: Math.round(equatedScore),
      ...(linking.intercept_se !== undefined ? { se: linking.intercept_se } : {})
    });
  });

  return table;
}

/**
 * Compute equating error
 */
function computeEquatingError(
  conversionTable: ConversionTableEntry[],
  computeSE: boolean = false
): EquatingError {
  
  // Placeholder computation
  const errors = conversionTable.map(entry => entry.se || 0);
  const rmse = Math.sqrt(mean(errors.map(e => e * e)));

  const conditionalSE: { [theta: string]: number } = {};
  if (computeSE) {
    conversionTable.forEach(entry => {
      conditionalSE[entry.theta.toFixed(2)] = entry.se || 0;
    });
  }

  return {
    overall_rmse: rmse,
    conditional_se: conditionalSE
  };
}

/**
 * Perform anchor diagnostics
 */
async function performAnchorDiagnostics(
  config: EquatingConfiguration,
  formData: FormParameters[]
): Promise<AnchorDiagnostics> {
  
  const [baseForm, targetForm] = formData;
  if (!baseForm || !targetForm) {
    throw new Error('Anchor diagnostics require at least two forms');
  }
  const anchorDrift: { [itemId: string]: number } = {};
  const anchorDif: { [itemId: string]: boolean } = {};
  const configuredThreshold = config.anchor_drift_threshold;
  const driftThreshold = typeof configuredThreshold === 'number'
    && Number.isFinite(configuredThreshold)
    && configuredThreshold >= 0
    && configuredThreshold <= 1
      ? configuredThreshold
      : 0.5;

  // Compute drift for each anchor item
  config.anchor_items.forEach(itemId => {
    const baseItem = baseForm.item_parameters[itemId];
    const targetItem = targetForm.item_parameters[itemId];
    
    if (baseItem && targetItem) {
      const drift = Math.abs(baseItem.difficulty - targetItem.difficulty);
      anchorDrift[itemId] = drift;
      anchorDif[itemId] = drift > driftThreshold;
    }
  });

  // Recommend anchors with low drift
  const recommendedAnchors = config.anchor_items.filter(
    itemId => !anchorDif[itemId]
  );

  return {
    anchor_drift: anchorDrift,
    anchor_dif: anchorDif,
    recommended_anchors: recommendedAnchors
  };
}

/**
 * Helper functions
 */

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const m = mean(values);
  const variance = values.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function getAnchorPairs(
  baseForm: FormParameters,
  targetForm: FormParameters,
  anchorItems: string[]
): Array<{ base: ItemParams; target: ItemParams }> {
  const itemIds = anchorItems.length > 0
    ? anchorItems
    : Object.keys(baseForm.item_parameters);
  return itemIds
    .map(itemId => ({
      base: baseForm.item_parameters[itemId],
      target: targetForm.item_parameters[itemId]
    }))
    .filter((pair): pair is { base: ItemParams; target: ItemParams } => {
      return pair.base !== undefined && pair.target !== undefined;
    });
}

function optimizeLinkingCoefficients(
  initial: LinkingCoefficients,
  objective: (slope: number, intercept: number) => number,
  options: {
    stepsCoarse?: number;
    stepsFine?: number;
    refine?: boolean;
  } = {}
): LinkingCoefficients {
  const slopeCenter = initial.slope || 1;
  const interceptCenter = initial.intercept || 0;
  const slopeMin = Math.max(0.01, slopeCenter * 0.5);
  const slopeMax = slopeCenter * 1.5;
  const interceptMin = interceptCenter - 2;
  const interceptMax = interceptCenter + 2;

  const stepsCoarse = Math.max(2, options.stepsCoarse ?? 11);
  const stepsFine = Math.max(2, options.stepsFine ?? 21);
  const refine = options.refine ?? true;

  const scanGrid = (
    slopeStart: number,
    slopeEnd: number,
    interceptStart: number,
    interceptEnd: number,
    steps: number,
    currentBest: { slope: number; intercept: number; value: number }
  ) => {
    for (let i = 0; i < steps; i++) {
      const slope = slopeStart + (slopeEnd - slopeStart) * (i / (steps - 1));
      for (let j = 0; j < steps; j++) {
        const intercept = interceptStart + (interceptEnd - interceptStart) * (j / (steps - 1));
        const value = objective(slope, intercept);
        if (!Number.isFinite(value)) {
          continue;
        }
        if (value < currentBest.value) {
          currentBest = { slope, intercept, value };
        }
      }
    }
    return currentBest;
  };

  let best = {
    slope: slopeCenter,
    intercept: interceptCenter,
    value: objective(slopeCenter, interceptCenter)
  };
  if (!Number.isFinite(best.value)) {
    best.value = Number.POSITIVE_INFINITY;
  }

  best = scanGrid(slopeMin, slopeMax, interceptMin, interceptMax, stepsCoarse, best);

  if (refine && Number.isFinite(best.value)) {
    const slopeStep = (slopeMax - slopeMin) / (stepsCoarse - 1);
    const interceptStep = (interceptMax - interceptMin) / (stepsCoarse - 1);
    const fineSlopeMin = Math.max(slopeMin, best.slope - slopeStep);
    const fineSlopeMax = Math.min(slopeMax, best.slope + slopeStep);
    const fineInterceptMin = Math.max(interceptMin, best.intercept - interceptStep);
    const fineInterceptMax = Math.min(interceptMax, best.intercept + interceptStep);

    best = scanGrid(fineSlopeMin, fineSlopeMax, fineInterceptMin, fineInterceptMax, stepsFine, best);
  }

  if (!Number.isFinite(best.value)) {
    return initial;
  }

  return {
    ...initial,
    slope: best.slope,
    intercept: best.intercept
  };
}
