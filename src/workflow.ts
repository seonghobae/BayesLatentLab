/**
 * Main analysis workflow orchestration
 */

import type { 
  ResponseData, 
  ItemMetadata,
  ModelResults,
  ParameterEstimates,
  ParameterSummary
} from './types/index.js';
import type { AnalysisConfiguration } from './models/specification.js';
import { 
  validateResponseData, 
  validateItemMetadata, 
  generateDataSummary,
  checkDataQuality 
} from './data/validation.js';
import { generateStanModel, getDefaultPriors } from './stan/templates.js';

export interface AnalysisInput {
  responses: ResponseData[];
  items: ItemMetadata[];
  config: AnalysisConfiguration;
  logger?: (message: string) => void;
}

export interface AnalysisOutput {
  success: boolean;
  results?: ModelResults;
  errors: string[];
  warnings: string[];
}

/**
 * Run complete analysis workflow
 */
export async function runAnalysis(input: AnalysisInput): Promise<AnalysisOutput> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const log = input.logger ?? (() => {});

  try {
    // Step 1: Validate input data
    log('Step 1: Validating input data...');
    const responseValidation = validateResponseData(input.responses);
    const itemValidation = validateItemMetadata(input.items);

    if (!responseValidation.valid) {
      errors.push(...responseValidation.errors);
      return { success: false, errors, warnings };
    }

    if (!itemValidation.valid) {
      errors.push(...itemValidation.errors);
      return { success: false, errors, warnings };
    }

    warnings.push(...responseValidation.warnings, ...itemValidation.warnings);

    // Step 2: Generate data summary
    log('Step 2: Generating data summary...');
    const dataSummary = generateDataSummary(input.responses, input.items);
    log(`  - ${dataSummary.n_persons} persons`);
    log(`  - ${dataSummary.n_items} items`);
    log(`  - ${dataSummary.n_responses} responses`);
    log(`  - ${(dataSummary.missing_rate * 100).toFixed(1)}% missing`);
    if (dataSummary.warnings) {
      warnings.push(...dataSummary.warnings);
    }

    // Step 3: Check data quality
    log('Step 3: Checking data quality...');
    const qualityCheck = checkDataQuality(dataSummary);
    warnings.push(...qualityCheck.warnings);

    // Step 4: Generate Stan model
    log('Step 4: Generating Stan model...');
    generateStanModel(input.config.model);  // For future Stan execution
    log(`  - Model family: ${input.config.model.model_family}`);
    log(`  - Link function: ${input.config.model.link}`);
    log(`  - Dimensions: ${input.config.model.dimensions}`);

    // Step 5: Prepare data for Stan
    log('Step 5: Preparing data for Stan...');
    prepareStanData(input.responses, input.items, input.config);  // For future Stan execution

    // Step 6: Run Stan estimation (placeholder)
    log('Step 6: Running Stan estimation...');
    log('  [Note: Actual Stan execution requires CmdStan installation]');
    log(`  - Chains: ${input.config.estimation.chains}`);
    log(`  - Iterations: ${input.config.estimation.iterations}`);
    log(`  - Warmup: ${input.config.estimation.warmup}`);

    // Step 7: Post-processing (placeholder)
    log('Step 7: Post-processing results...');

    // TODO: Replace placeholder parameter summaries with Stan extraction.
    const placeholderSummary = (): ParameterSummary => ({
      mean: 0,
      median: 0,
      sd: 0,
      q025: 0,
      q975: 0,
      ess_bulk: 0,
      ess_tail: 0,
      rhat: 1
    });
    const personIds = Array.from(new Set(input.responses.map(r => r.person_id)));
    const itemIds = Array.from(new Set(input.items.map(item => item.item_id)));
    const thetaParams = Object.fromEntries(
      personIds.map(id => [id, placeholderSummary()])
    );
    const itemParams = Object.fromEntries(
      itemIds.map(id => [id, placeholderSummary()])
    );
    const parameters: ParameterEstimates = {
      theta: thetaParams,
      discrimination: itemParams,
      difficulty: itemParams
    };
    if (input.config.model.model_family === 'irt_3pl') {
      parameters.guessing = itemParams;
    }
    if (input.config.model.model_family === 'grm' || input.config.model.model_family === 'gpcm') {
      const thresholds: Record<string, ParameterSummary[]> = {};
      input.items.forEach(item => {
        if (item.categories && item.categories.length > 1) {
          thresholds[item.item_id] = Array.from(
            { length: item.categories.length - 1 },
            () => placeholderSummary()
          );
        }
      });
      parameters.thresholds = thresholds;
    }

    // For now, return a placeholder result
    const results: ModelResults = {
      model_id: `model_${Date.now()}`,
      model_spec: input.config.model,
      estimation_settings: input.config.estimation,
      convergence: {
        rhat: {},
        ess_bulk: {},
        ess_tail: {},
        divergences: 0,
        max_treedepth_hits: 0,
        converged: true
      },
      parameters,
      warnings: warnings,
      timestamp: new Date(),
      seed: input.config.estimation.seed
    };

    return {
      success: true,
      results,
      errors: [],
      warnings
    };

  } catch (error) {
    errors.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Prepare data in Stan format
 */
function prepareStanData(
  responses: ResponseData[],
  items: ItemMetadata[],
  config: AnalysisConfiguration
): Record<string, unknown> {
  
  // Create mappings - sort for reproducibility
  const personIds = Array.from(new Set(responses.map(r => r.person_id))).sort();
  const itemIds = Array.from(new Set(responses.map(r => r.item_id))).sort();
  
  const personMap = new Map(personIds.map((id, i) => [id, i + 1]));
  const itemMap = new Map(itemIds.map((id, i) => [id, i + 1]));

  // Prepare Stan data structure with validation
  const stanData: Record<string, unknown> = {
    N: responses.length,
    I: itemIds.length,
    J: personIds.length,
    ii: responses.map(r => {
      const idx = itemMap.get(r.item_id);
      if (idx === undefined) throw new Error(`Unknown item_id: ${r.item_id}`);
      return idx;
    }),
    jj: responses.map(r => {
      const idx = personMap.get(r.person_id);
      if (idx === undefined) throw new Error(`Unknown person_id: ${r.person_id}`);
      return idx;
    }),
    y: responses.map(r => r.response)
  };

  // Add priors - check if keys already have 'prior_' prefix
  const priors = config.model.priors || getDefaultPriors(config.model.model_family);
  Object.entries(priors).forEach(([key, value]) => {
    // Only add 'prior_' prefix if not already present
    if (key.startsWith('prior_')) {
      stanData[key] = value;
    } else {
      stanData[`prior_${key}`] = value;
    }
  });

  // Add ordinal-specific data if needed
  if (config.model.model_family === 'grm' || config.model.model_family === 'gpcm') {
    const ordinalItems = items.filter(item => 
      item.categories && item.categories.length > 0
    );
    
    if (ordinalItems.length === 0) {
      throw new Error('GRM/GPCM models require items with category definitions');
    }
    
    // K should be the maximum number of categories across all items
    const categoryCounts = ordinalItems.map(item => item.categories!.length);
    const allCategories = ordinalItems.flatMap(item => item.categories!);
    const minCategory = Math.min(...allCategories);
    const maxCategory = Math.max(...allCategories);
    const maxCount = Math.max(...categoryCounts);
    const maxCategories = minCategory === 0
      ? Math.max(maxCount, maxCategory + 1)
      : maxCount;
    stanData.K = maxCategories;
  }

  return stanData;
}
