/**
 * Core type definitions for BayesLatentLab
 */

// Item types
export type ItemType = 'binary' | 'ordinal' | 'nominal' | 'continuous';

// Model types
export type ModelType = 'irt' | 'mirt' | 'cfa' | 'efa' | 'emirt' | 'multilevel_irt' | 'multilevel_cfa';

// IRT model families
export type IRTModelFamily = 
  | 'rasch_1pl'           // Rasch: fixed discrimination (a=1)
  | 'irt_1pl_common_slope' // 1PL: common discrimination (estimated)
  | 'irt_2pl'             // 2PL: item-specific discrimination
  | 'irt_3pl'             // 3PL: adds lower asymptote
  | 'irt_4pl'             // 4PL: adds upper asymptote
  | 'irt_5pl'             // 5PL: adds asymmetry parameter
  | 'grm'                 // Graded Response Model
  | 'gpcm'                // Generalized Partial Credit Model
  | 'pcm'                 // Partial Credit Model
  | 'nrm';                // Nominal Response Model

// Link functions
export type LinkFunction = 'logit' | 'probit';

// Multilevel structure
export type MultilevelType = 'none' | 'random_intercept' | 'random_loading' | 'crossed';

// DIF testing methods
export type DIFMethod = 'irt_lr' | 'wald' | 'lord' | 'bayesian';

// Equating methods
export type EquatingMethod = 'concurrent' | 'separate_linking' | 'fipc';
export type LinkingMethod = 'mean_mean' | 'mean_sigma' | 'stocking_lord' | 'haebara';

// Fit statistics
export type FitStatistic = 'infit' | 'outfit' | 'zh' | 's_x2' | 'item_fit';

// Data structure
export interface ResponseData {
  person_id: string;
  item_id: string;
  response: number;
  group_id?: string;
  form_id?: string;
  weight?: number;
}

// Item metadata
export interface ItemMetadata {
  item_id: string;
  item_type: ItemType;
  categories?: number[];
  category_labels?: string[];
  reverse_coded?: boolean;
  anchor_item?: boolean;
  testlet_id?: string;
}

// Testlet specification
export interface TestletSpecification {
  testlet_id: string;
  items: string[];
  random_effect: 'intercept' | 'loading' | 'both';
}

// Person metadata
export interface PersonMetadata {
  person_id: string;
  group_id?: string;
  form_id?: string;
  focal_group?: boolean;
  weight?: number;
}

// Model specification
export interface ModelSpecification {
  model_type: ModelType;
  model_family: IRTModelFamily;
  link: LinkFunction;
  dimensions: number | 'auto';
  multilevel: MultilevelType;
  priors?: PriorSpecification;
  constraints?: ConstraintSpecification;
}

// Prior specification
export interface PriorSpecification {
  theta_mean?: number;
  theta_sd?: number;
  discrimination_mean?: number;
  discrimination_sd?: number;
  difficulty_mean?: number;
  difficulty_sd?: number;
  guessing_alpha?: number;
  guessing_beta?: number;
  shrinkage_lambda?: number;
}

// Constraint specification
export interface ConstraintSpecification {
  fixed_loadings?: { [item_id: string]: number[] };
  fixed_thresholds?: { [item_id: string]: number[] };
  equality_constraints?: string[][];
}

// Estimation settings
export interface EstimationSettings {
  sampler: 'nuts' | 'hmc';
  chains: number;
  iterations: number;
  warmup: number;
  thin: number;
  seed: number;
  adapt_delta?: number;
  max_treedepth?: number;
  parallel_chains?: boolean;
}

// Dimension selection configuration
export interface DimensionSelectionConfiguration {
  method: 'loo' | 'waic' | 'elpd_grid' | 'shrinkage';
  dimension_range: [number, number];
  criteria?: ('elpd' | 'se' | 'residual')[];
}

// Dimension selection results
export interface ModelComparisonResult {
  dimension: number;
  elpd: number;
  se: number;
  elpd_diff?: number;
  weight?: number;
}

export interface DimensionSelectionResults {
  selected_dimension: number;
  model_comparisons: ModelComparisonResult[];
  effective_dimension?: number;
}

// DIF configuration
export interface DIFConfiguration {
  method: DIFMethod;
  reference_group: string;
  focal_groups: string[];
  anchor_items: string[];
  test_parameters: ('discrimination' | 'difficulty' | 'thresholds')[];
  multiple_comparison_correction?: 'none' | 'bonferroni' | 'holm' | 'fdr';
  effect_size?: boolean;
  method_options?: {
    sequential_testing?: boolean;
    posterior_threshold?: number;
    effect_size_metric?: 'param_diff' | 'ncdif' | 'ets_classification';
  };
}

// Equating configuration
export interface EquatingConfiguration {
  method: EquatingMethod;
  linking_method?: LinkingMethod;
  base_form: string;
  target_forms: string[];
  anchor_items: string[];
  compute_se?: boolean;
  sensitivity_analysis?: boolean;
}

// Model results
export interface ModelResults {
  model_id: string;
  model_spec: ModelSpecification;
  estimation_settings: EstimationSettings;
  convergence: ConvergenceDiagnostics;
  parameters: ParameterEstimates;
  fit_statistics?: FitStatistics;
  dif_results?: DIFResults;
  equating_results?: EquatingResults;
  dimension_selection?: DimensionSelectionResults;
  warnings: string[];
  timestamp: Date;
  seed: number;
}

// Convergence diagnostics
export interface ConvergenceDiagnostics {
  rhat: { [param: string]: number };
  ess_bulk: { [param: string]: number };
  ess_tail: { [param: string]: number };
  divergences: number;
  max_treedepth_hits: number;
  converged: boolean;
}

// Parameter estimates
export interface ParameterEstimates {
  theta?: { [person_id: string]: ParameterSummary };
  discrimination?: { [item_id: string]: ParameterSummary };
  difficulty?: { [item_id: string]: ParameterSummary };
  thresholds?: { [item_id: string]: ParameterSummary[] };
  guessing?: { [item_id: string]: ParameterSummary };
  upper_asymptote?: { [item_id: string]: ParameterSummary };
  loadings?: { [item_id: string]: ParameterSummary[] };
  loading_matrix?: {
    items: string[];
    dimensions: number;
    values: number[][];
    rotated: boolean;
    rotation_method?: 'varimax' | 'promax' | 'oblimin';
  };
  factor_correlations?: {
    dimensions: number;
    matrix: number[][];
  };
  testlet_effects?: { [testlet_id: string]: ParameterSummary };
  factor_scores?: { [person_id: string]: ParameterSummary[] };
}

// Parameter summary
export interface ParameterSummary {
  mean: number;
  median: number;
  sd: number;
  q025: number;
  q975: number;
  ess_bulk: number;
  ess_tail: number;
  rhat: number;
}

// Fit statistics
export interface FitStatistics {
  loo?: { elpd: number; p_loo: number; looic: number };
  waic?: { elpd: number; p_waic: number; waic: number };
  item_fit?: { [item_id: string]: ItemFitStatistics };
  person_fit?: { [person_id: string]: PersonFitStatistics };
}

// Item fit statistics
export interface ItemFitStatistics {
  infit?: number;
  infit_z?: number;
  outfit?: number;
  outfit_z?: number;
  s_x2?: number;
  s_x2_p?: number;
}

// Person fit statistics
export interface PersonFitStatistics {
  zh?: number;
  zh_p?: number;
}

// DIF results
export interface DIFResults {
  method: DIFMethod;
  item_results: { [item_id: string]: DIFItemResult };
  anchor_items: string[];
  flagged_items: string[];
}

// DIF item result
export interface DIFItemResult {
  statistic: number;
  p_value: number;
  effect_size?: number;
  flagged: boolean;
  parameter_differences?: { [param: string]: number };
}

// Equating results
export interface EquatingResults {
  method: EquatingMethod;
  linking_coefficients: LinkingCoefficients;
  conversion_table: ConversionTableEntry[];
  equating_error: EquatingError;
  anchor_diagnostics?: AnchorDiagnostics;
}

// Linking coefficients
export interface LinkingCoefficients {
  slope: number;
  intercept: number;
  slope_se?: number;
  intercept_se?: number;
}

// Conversion table entry
export interface ConversionTableEntry {
  raw_score: number;
  theta: number;
  equated_score: number;
  se?: number;
}

// Equating error
export interface EquatingError {
  overall_rmse: number;
  conditional_se: { [theta: string]: number };
}

// Anchor diagnostics
export interface AnchorDiagnostics {
  anchor_drift: { [item_id: string]: number };
  anchor_dif: { [item_id: string]: boolean };
  recommended_anchors: string[];
}

// Local dependence diagnostics
export interface LocalDependenceDiagnostics {
  q3_matrix: { [item_pair: string]: number };
  flagged_pairs: [string, string][];
  testlet_suggestions: { [testlet_id: string]: string[] };
}
