/**
 * DIF (Differential Item Functioning) detection module
 */

import { jStat } from 'jstat';
import type { DIFConfiguration, DIFResults, DIFItemResult } from '../types/index.js';

/**
 * Run DIF analysis
 */
export async function runDIFAnalysis(
  config: DIFConfiguration,
  itemParameters: { [itemId: string]: ItemParameters },
  groupData: GroupData
): Promise<DIFResults> {
  
  switch (config.method) {
    case 'irt_lr':
      return runIRTLikelihoodRatioDIF(config, itemParameters, groupData);
    case 'wald':
      return runWaldDIF(config, itemParameters, groupData);
    case 'lord':
      return runLordDIF(config, itemParameters, groupData);
    case 'bayesian':
      return runBayesianDIF(config, itemParameters, groupData);
    default:
      throw new Error(`DIF method ${config.method} not implemented`);
  }
}

interface ItemParameters {
  discrimination?: number;
  difficulty?: number;
  thresholds?: number[];
  se?: {
    discrimination?: number;
    difficulty?: number;
  };
}

interface GroupData {
  reference: { [itemId: string]: ItemParameters };
  focal: { [itemId: string]: ItemParameters };
}

/**
 * IRT Likelihood Ratio DIF test
 */
function runIRTLikelihoodRatioDIF(
  config: DIFConfiguration,
  itemParameters: { [itemId: string]: ItemParameters },
  groupData: GroupData
): DIFResults {
  
  const itemResults: { [itemId: string]: DIFItemResult } = {};
  const flaggedItems: string[] = [];

  // For each item not in anchor set
  for (const itemId of Object.keys(itemParameters)) {
    if (config.anchor_items.includes(itemId)) {
      continue;
    }

    // Compute likelihood ratio statistic
    // This is a placeholder - actual implementation would require
    // log-likelihood computation from constrained and free models
    const lr = computeLikelihoodRatio(itemId, groupData);
    const df = config.test_parameters.length;
    const pValue = chiSquarePValue(lr, df);
    
    const effectSize = config.effect_size 
      ? computeDIFEffectSize(itemId, groupData)
      : undefined;

    const flagged = pValue < 0.05;  // Simple threshold

    itemResults[itemId] = {
      statistic: lr,
      p_value: pValue,
      flagged,
      parameter_differences: computeParameterDifferences(itemId, groupData),
      ...(effectSize !== undefined ? { effect_size: effectSize } : {})
    };

    if (flagged) {
      flaggedItems.push(itemId);
    }
  }

  // Apply multiple comparison correction if requested
  if (config.multiple_comparison_correction && config.multiple_comparison_correction !== 'none') {
    applyMultipleComparisonCorrection(itemResults, config.multiple_comparison_correction);
  }

  return {
    method: config.method,
    item_results: itemResults,
    anchor_items: config.anchor_items,
    flagged_items: flaggedItems
  };
}

/**
 * Wald DIF test
 */
function runWaldDIF(
  config: DIFConfiguration,
  itemParameters: { [itemId: string]: ItemParameters },
  groupData: GroupData
): DIFResults {
  
  const itemResults: { [itemId: string]: DIFItemResult } = {};
  const flaggedItems: string[] = [];

  for (const itemId of Object.keys(itemParameters)) {
    if (config.anchor_items.includes(itemId)) {
      continue;
    }

    // Wald statistic based on parameter difference and covariance
    const waldStat = computeWaldStatistic(itemId, groupData, config.test_parameters);
    const df = config.test_parameters.length;
    const pValue = chiSquarePValue(waldStat, df);
    
    const flagged = pValue < 0.05;

    const effectSize = config.effect_size ? computeDIFEffectSize(itemId, groupData) : undefined;
    itemResults[itemId] = {
      statistic: waldStat,
      p_value: pValue,
      flagged,
      parameter_differences: computeParameterDifferences(itemId, groupData),
      ...(effectSize !== undefined ? { effect_size: effectSize } : {})
    };

    if (flagged) {
      flaggedItems.push(itemId);
    }
  }

  return {
    method: config.method,
    item_results: itemResults,
    anchor_items: config.anchor_items,
    flagged_items: flaggedItems
  };
}

/**
 * Lord's DIF test
 */
function runLordDIF(
  config: DIFConfiguration,
  itemParameters: { [itemId: string]: ItemParameters },
  groupData: GroupData
): DIFResults {
  // Lord's test is similar to Wald but with specific weighting
  return runWaldDIF(config, itemParameters, groupData);
}

/**
 * Bayesian DIF test
 */
function runBayesianDIF(
  config: DIFConfiguration,
  itemParameters: { [itemId: string]: ItemParameters },
  groupData: GroupData
): DIFResults {
  
  const itemResults: { [itemId: string]: DIFItemResult } = {};
  const flaggedItems: string[] = [];

  for (const itemId of Object.keys(itemParameters)) {
    if (config.anchor_items.includes(itemId)) {
      continue;
    }

    // Bayesian approach: compute posterior probability that difference > threshold
    const posteriorProb = computePosteriorDIFProbability(itemId, groupData);
    
    const flagged = posteriorProb > 0.95;  // High posterior probability of DIF

    const effectSize = config.effect_size ? computeDIFEffectSize(itemId, groupData) : undefined;
    itemResults[itemId] = {
      statistic: posteriorProb,
      p_value: 1 - posteriorProb,  // Convert to p-value analog
      flagged,
      parameter_differences: computeParameterDifferences(itemId, groupData),
      ...(effectSize !== undefined ? { effect_size: effectSize } : {})
    };

    if (flagged) {
      flaggedItems.push(itemId);
    }
  }

  return {
    method: config.method,
    item_results: itemResults,
    anchor_items: config.anchor_items,
    flagged_items: flaggedItems
  };
}

/**
 * Helper functions (placeholders for actual implementations)
 */

function computeLikelihoodRatio(_itemId: string, _groupData: GroupData): number {
  // Placeholder: would compute -2 * (log L_constrained - log L_free)
  return Math.random() * 10;
}

function computeWaldStatistic(
  _itemId: string, 
  _groupData: GroupData,
  _parameters: ('discrimination' | 'difficulty' | 'thresholds')[]
): number {
  // Placeholder: would compute (β_ref - β_focal)' * Σ^-1 * (β_ref - β_focal)
  return Math.random() * 10;
}

function computePosteriorDIFProbability(_itemId: string, _groupData: GroupData): number {
  // Placeholder: would compute P(|β_ref - β_focal| > threshold | data)
  return Math.random();
}

function computeDIFEffectSize(_itemId: string, _groupData: GroupData): number {
  // Placeholder: would compute standardized parameter difference or expected score difference
  return Math.random() * 0.5;
}

function computeParameterDifferences(
  _itemId: string, 
  groupData: GroupData
): { [param: string]: number } {
  const ref = groupData.reference[_itemId] || {};
  const focal = groupData.focal[_itemId] || {};
  
  const diffs: { [param: string]: number } = {};
  
  if (ref.discrimination !== undefined && focal.discrimination !== undefined) {
    diffs.discrimination = ref.discrimination - focal.discrimination;
  }
  
  if (ref.difficulty !== undefined && focal.difficulty !== undefined) {
    diffs.difficulty = ref.difficulty - focal.difficulty;
  }
  
  return diffs;
}

function chiSquarePValue(statistic: number, df: number): number {
  return 1 - jStat.chisquare.cdf(statistic, df);
}

function applyMultipleComparisonCorrection(
  itemResults: { [itemId: string]: DIFItemResult },
  method: string
): void {
  const itemIds = Object.keys(itemResults);
  const pValues = itemIds.map(id => {
    const result = itemResults[id];
    return result ? result.p_value : 1;
  });
  
  let adjustedPValues: number[];
  
  switch (method) {
    case 'bonferroni':
      adjustedPValues = pValues.map(p => Math.min(p * pValues.length, 1));
      break;
    case 'holm':
      adjustedPValues = holmCorrection(pValues);
      break;
    case 'fdr':
      adjustedPValues = fdrCorrection(pValues);
      break;
    default:
      return;
  }
  
  // Update p-values and flagged status
  itemIds.forEach((id, i) => {
    const result = itemResults[id];
    const adjusted = adjustedPValues[i];
    if (!result || adjusted === undefined) {
      return;
    }
    result.p_value = adjusted;
    result.flagged = adjusted < 0.05;
  });
}

function holmCorrection(pValues: number[]): number[] {
  const n = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adjusted = new Array(n);
  let maxAdjusted = 0;
  
  // Process in sorted order and enforce monotonicity
  for (let k = 0; k < n; k++) {
    const entry = indexed[k];
    if (!entry) {
      continue;
    }
    if (!Number.isInteger(entry.i) || entry.i < 0 || entry.i >= n) {
      continue;
    }
    const current = Math.min(entry.p * (n - k), 1);
    maxAdjusted = Math.max(maxAdjusted, current);
    adjusted[entry.i] = maxAdjusted;
  }
  
  return adjusted;
}

function fdrCorrection(pValues: number[]): number[] {
  const n = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adjusted = new Array(n);
  let minAdjusted = 1;  // Work backwards to enforce monotonicity
  
  // Process in reverse order to ensure monotonicity
  for (let k = n - 1; k >= 0; k--) {
    const entry = indexed[k];
    if (!entry) {
      continue;
    }
    if (!Number.isInteger(entry.i) || entry.i < 0 || entry.i >= n) {
      continue;
    }
    const current = Math.min(entry.p * n / (k + 1), 1);
    minAdjusted = Math.min(minAdjusted, current);
    adjusted[entry.i] = minAdjusted;
  }
  
  return adjusted;
}

/**
 * Anchor purification procedure
 */
export async function purifyAnchors(
  config: DIFConfiguration,
  itemParameters: { [itemId: string]: ItemParameters },
  groupData: GroupData,
  maxIterations: number = 5
): Promise<string[]> {
  
  let currentAnchors = [...config.anchor_items];
  let iteration = 0;
  let converged = false;
  
  while (!converged && iteration < maxIterations) {
    // Run DIF with current anchors
    const tempConfig = { ...config, anchor_items: currentAnchors };
    const results = await runDIFAnalysis(tempConfig, itemParameters, groupData);
    
    // Remove flagged items from anchors
    const newAnchors = currentAnchors.filter(id => !results.flagged_items.includes(id));
    
    // Check convergence - both length and content must match
    const anchorSet = new Set(currentAnchors);
    converged = newAnchors.length === currentAnchors.length &&
                newAnchors.every(id => anchorSet.has(id));
    currentAnchors = newAnchors;
    iteration++;
  }
  
  return currentAnchors;
}
