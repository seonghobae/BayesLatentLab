/**
 * Model specification and configuration module
 */

import * as yaml from 'yaml';
import type { 
  ModelSpecification, 
  EstimationSettings,
  DIFConfiguration,
  EquatingConfiguration,
  PriorSpecification
} from '../types/index.js';

export interface AnalysisConfiguration {
  model: ModelSpecification;
  estimation: EstimationSettings;
  dif?: DIFConfiguration;
  equating?: EquatingConfiguration;
  dimension_selection?: DimensionSelectionConfig;
  local_dependence?: LocalDependenceConfig;
}

export interface DimensionSelectionConfig {
  method: 'grid_search' | 'shrinkage' | 'manual';
  min_dimensions?: number;
  max_dimensions?: number;
  comparison_metric: 'loo' | 'waic' | 'both';
}

export interface LocalDependenceConfig {
  detect: boolean;
  threshold?: number;  // Q3 threshold for flagging
  resolve_method?: 'testlet' | 'residual_correlation' | 'latent_space';
}

/**
 * Load analysis configuration from YAML
 */
export function loadConfigFromYAML(yamlString: string): AnalysisConfiguration {
  const config = yaml.parse(yamlString, {
    schema: 'core',
    maxAliasCount: 100,
    stringKeys: true,
    strict: true
  });
  validateConfig(config);
  return config as AnalysisConfiguration;
}

/**
 * Save analysis configuration to YAML
 */
export function saveConfigToYAML(config: AnalysisConfiguration): string {
  return yaml.stringify(config);
}

/**
 * Create default configuration
 */
export function createDefaultConfig(): AnalysisConfiguration {
  return {
    model: {
      model_type: 'irt',
      model_family: 'irt_2pl',
      link: 'logit',
      dimensions: 1,
      multilevel: 'none',
      priors: getDefaultPriors()
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 2000,
      warmup: 1000,
      thin: 1,
      seed: 12345,
      adapt_delta: 0.8,  // Start with Stan default; increase if divergences occur
      max_treedepth: 12,
      parallel_chains: true
    }
  };
}

/**
 * Get default priors
 */
function getDefaultPriors(): PriorSpecification {
  return {
    theta_mean: 0,
    theta_sd: 1,
    discrimination_mean: 0,
    discrimination_sd: 1,
    difficulty_mean: 0,
    difficulty_sd: 2,
    guessing_alpha: 5,
    guessing_beta: 17
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): void {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Configuration must be an object');
  }

  const cfg = config as Partial<AnalysisConfiguration>;

  if (!cfg.model) {
    throw new Error('Model specification is required');
  }

  if (!cfg.estimation) {
    throw new Error('Estimation settings are required');
  }

  // Validate model specification
  validateModelSpec(cfg.model);
  
  // Validate estimation settings
  validateEstimationSettings(cfg.estimation);

  // Validate optional sections
  if (cfg.dif) {
    validateDIFConfig(cfg.dif);
  }

  if (cfg.equating) {
    validateEquatingConfig(cfg.equating);
  }
}

/**
 * Validate model specification
 */
function validateModelSpec(spec: Partial<ModelSpecification>): void {
  const validModelTypes = ['irt', 'mirt', 'cfa', 'efa', 'emirt', 'multilevel_irt', 'multilevel_cfa'];
  if (!spec.model_type || !validModelTypes.includes(spec.model_type)) {
    throw new Error(`Invalid model_type. Must be one of: ${validModelTypes.join(', ')}`);
  }

  const validFamilies = [
    'rasch_1pl', 'irt_1pl_common_slope', 'irt_2pl', 'irt_3pl', 'irt_4pl', 'irt_5pl',
    'grm', 'gpcm', 'pcm', 'nrm'
  ];
  if (!spec.model_family || !validFamilies.includes(spec.model_family)) {
    throw new Error(`Invalid model_family. Must be one of: ${validFamilies.join(', ')}`);
  }

  const validLinks = ['logit', 'probit'];
  if (!spec.link || !validLinks.includes(spec.link)) {
    throw new Error(`Invalid link function. Must be one of: ${validLinks.join(', ')}`);
  }

  if (spec.dimensions !== 'auto' && (typeof spec.dimensions !== 'number' || spec.dimensions < 1)) {
    throw new Error('dimensions must be a positive integer or "auto"');
  }
}

/**
 * Validate estimation settings
 */
function validateEstimationSettings(settings: Partial<EstimationSettings>): void {
  if (!settings.sampler || !['nuts', 'hmc'].includes(settings.sampler)) {
    throw new Error('sampler must be "nuts" or "hmc"');
  }

  if (!settings.chains || settings.chains < 1) {
    throw new Error('chains must be a positive integer');
  }

  if (!settings.iterations || settings.iterations < 1) {
    throw new Error('iterations must be a positive integer');
  }

  if (!settings.warmup || settings.warmup < 0) {
    throw new Error('warmup must be non-negative');
  }

  if (settings.warmup && settings.iterations && settings.warmup >= settings.iterations) {
    throw new Error('warmup must be less than iterations');
  }

  if (settings.seed === undefined || settings.seed === null) {
    throw new Error('seed is required');
  }
  
  if (!Number.isInteger(settings.seed)) {
    throw new Error('seed must be an integer');
  }
}

/**
 * Validate DIF configuration
 */
function validateDIFConfig(config: Partial<DIFConfiguration>): void {
  const validMethods = ['irt_lr', 'wald', 'lord', 'bayesian'];
  if (!config.method || !validMethods.includes(config.method)) {
    throw new Error(`DIF method must be one of: ${validMethods.join(', ')}`);
  }

  if (!config.reference_group) {
    throw new Error('reference_group is required for DIF analysis');
  }

  if (!config.focal_groups || config.focal_groups.length === 0) {
    throw new Error('At least one focal_group is required for DIF analysis');
  }

  if (!config.anchor_items || config.anchor_items.length === 0) {
    throw new Error('anchor_items are required for DIF analysis');
  }
}

/**
 * Validate equating configuration
 */
function validateEquatingConfig(config: Partial<EquatingConfiguration>): void {
  const validMethods = ['concurrent', 'separate_linking', 'fipc'];
  if (!config.method || !validMethods.includes(config.method)) {
    throw new Error(`Equating method must be one of: ${validMethods.join(', ')}`);
  }

  if (!config.base_form) {
    throw new Error('base_form is required for equating');
  }

  if (!config.target_forms || config.target_forms.length === 0) {
    throw new Error('At least one target_form is required for equating');
  }

  if (!config.anchor_items || config.anchor_items.length === 0) {
    throw new Error('anchor_items are required for equating');
  }

  if (config.method === 'separate_linking' || config.method === 'fipc') {
    const validLinkingMethods = ['mean_mean', 'mean_sigma', 'stocking_lord', 'haebara'];
    if (config.linking_method && !validLinkingMethods.includes(config.linking_method)) {
      throw new Error(`linking_method must be one of: ${validLinkingMethods.join(', ')}`);
    }
  }
}

/**
 * Create example configurations for different use cases
 */
export const exampleConfigs = {
  /**
   * Simple 2PL IRT model
   */
  simple2PL: (): AnalysisConfiguration => ({
    model: {
      model_type: 'irt',
      model_family: 'irt_2pl',
      link: 'logit',
      dimensions: 1,
      multilevel: 'none'
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 2000,
      warmup: 1000,
      thin: 1,
      seed: 12345,
      parallel_chains: true
    }
  }),

  /**
   * Rasch model (1PL with fixed discrimination)
   */
  rasch: (): AnalysisConfiguration => ({
    model: {
      model_type: 'irt',
      model_family: 'rasch_1pl',
      link: 'logit',
      dimensions: 1,
      multilevel: 'none'
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 2000,
      warmup: 1000,
      thin: 1,
      seed: 12345,
      parallel_chains: true
    }
  }),

  /**
   * Graded Response Model for ordinal data
   */
  grm: (): AnalysisConfiguration => ({
    model: {
      model_type: 'irt',
      model_family: 'grm',
      link: 'logit',
      dimensions: 1,
      multilevel: 'none'
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 2000,
      warmup: 1000,
      thin: 1,
      seed: 12345,
      adapt_delta: 0.99,  // Higher for ordinal models
      parallel_chains: true
    }
  }),

  /**
   * Multilevel 2PL with random intercepts
   */
  multilevel2PL: (): AnalysisConfiguration => ({
    model: {
      model_type: 'multilevel_irt',
      model_family: 'irt_2pl',
      link: 'logit',
      dimensions: 1,
      multilevel: 'random_intercept'
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 3000,
      warmup: 1500,
      thin: 1,
      seed: 12345,
      adapt_delta: 0.99,
      max_treedepth: 14,
      parallel_chains: true
    }
  }),

  /**
   * Configuration with DIF analysis
   */
  withDIF: (): AnalysisConfiguration => ({
    model: {
      model_type: 'irt',
      model_family: 'irt_2pl',
      link: 'logit',
      dimensions: 1,
      multilevel: 'none'
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 2000,
      warmup: 1000,
      thin: 1,
      seed: 12345,
      parallel_chains: true
    },
    dif: {
      method: 'irt_lr',
      reference_group: 'group_a',
      focal_groups: ['group_b'],
      anchor_items: ['item_1', 'item_2', 'item_3'],
      test_parameters: ['discrimination', 'difficulty'],
      multiple_comparison_correction: 'holm',
      effect_size: true
    }
  }),

  /**
   * Configuration with equating/linking
   */
  withEquating: (): AnalysisConfiguration => ({
    model: {
      model_type: 'irt',
      model_family: 'irt_2pl',
      link: 'logit',
      dimensions: 1,
      multilevel: 'none'
    },
    estimation: {
      sampler: 'nuts',
      chains: 4,
      iterations: 2000,
      warmup: 1000,
      thin: 1,
      seed: 12345,
      parallel_chains: true
    },
    equating: {
      method: 'separate_linking',
      linking_method: 'stocking_lord',
      base_form: 'form_a',
      target_forms: ['form_b'],
      anchor_items: ['item_1', 'item_2', 'item_3', 'item_4'],
      compute_se: true,
      sensitivity_analysis: true
    }
  })
};
