/**
 * Main analysis workflow orchestration
 */

import { 
  ResponseData, 
  ItemMetadata,
  ModelResults
} from './types';
import { AnalysisConfiguration } from './models/specification';
import { 
  validateResponseData, 
  validateItemMetadata, 
  generateDataSummary,
  checkDataQuality 
} from './data/validation';
import { generateStanModel, getDefaultPriors } from './stan/templates';

export interface AnalysisInput {
  responses: ResponseData[];
  items: ItemMetadata[];
  config: AnalysisConfiguration;
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

  try {
    // Step 1: Validate input data
    console.log('Step 1: Validating input data...');
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
    console.log('Step 2: Generating data summary...');
    const dataSummary = generateDataSummary(input.responses, input.items);
    console.log(`  - ${dataSummary.n_persons} persons`);
    console.log(`  - ${dataSummary.n_items} items`);
    console.log(`  - ${dataSummary.n_responses} responses`);
    console.log(`  - ${(dataSummary.missing_rate * 100).toFixed(1)}% missing`);

    // Step 3: Check data quality
    console.log('Step 3: Checking data quality...');
    const qualityCheck = checkDataQuality(dataSummary);
    warnings.push(...qualityCheck.warnings);

    // Step 4: Generate Stan model
    console.log('Step 4: Generating Stan model...');
    generateStanModel(input.config.model);  // For future Stan execution
    console.log(`  - Model family: ${input.config.model.model_family}`);
    console.log(`  - Link function: ${input.config.model.link}`);
    console.log(`  - Dimensions: ${input.config.model.dimensions}`);

    // Step 5: Prepare data for Stan
    console.log('Step 5: Preparing data for Stan...');
    prepareStanData(input.responses, input.items, input.config);  // For future Stan execution

    // Step 6: Run Stan estimation (placeholder)
    console.log('Step 6: Running Stan estimation...');
    console.log('  [Note: Actual Stan execution requires CmdStan installation]');
    console.log(`  - Chains: ${input.config.estimation.chains}`);
    console.log(`  - Iterations: ${input.config.estimation.iterations}`);
    console.log(`  - Warmup: ${input.config.estimation.warmup}`);

    // Step 7: Post-processing (placeholder)
    console.log('Step 7: Post-processing results...');

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
      parameters: {},
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
  
  // Create mappings
  const personIds = Array.from(new Set(responses.map(r => r.person_id)));
  const itemIds = Array.from(new Set(responses.map(r => r.item_id)));
  
  const personMap = new Map(personIds.map((id, i) => [id, i + 1]));
  const itemMap = new Map(itemIds.map((id, i) => [id, i + 1]));

  // Prepare Stan data structure
  const stanData: Record<string, unknown> = {
    N: responses.length,
    I: itemIds.length,
    J: personIds.length,
    ii: responses.map(r => itemMap.get(r.item_id)),
    jj: responses.map(r => personMap.get(r.person_id)),
    y: responses.map(r => r.response)
  };

  // Add priors
  const priors = config.model.priors || getDefaultPriors(config.model.model_family);
  Object.entries(priors).forEach(([key, value]) => {
    stanData[`prior_${key}`] = value;
  });

  // Add ordinal-specific data if needed
  if (config.model.model_family === 'grm' || config.model.model_family === 'gpcm') {
    const maxCategories = Math.max(...items
      .filter(item => item.categories)
      .map(item => item.categories!.length));
    stanData.K = maxCategories;
  }

  return stanData;
}
