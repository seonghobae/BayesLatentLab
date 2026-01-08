/**
 * Stan model template generator for IRT models
 */

import type { ModelSpecification, IRTModelFamily } from '../types/index.js';

export interface StanModelTemplate {
  data_block: string;
  parameters_block: string;
  transformed_parameters_block?: string;
  model_block: string;
  generated_quantities_block?: string;
}

/**
 * Generate Stan model code from specification
 */
export function generateStanModel(spec: ModelSpecification): string {
  if (spec.dimensions !== 1) {
    throw new Error(`Stan template generation supports only 1 dimension (got ${spec.dimensions}).`);
  }
  if (spec.multilevel !== 'none') {
    throw new Error(`Stan template generation does not support multilevel models (got ${spec.multilevel}).`);
  }
  const template = getModelTemplate(spec);
  
  return `
// Generated Stan model for ${spec.model_family}
// BayesLatentLab v0.1.0

${template.data_block}

${template.parameters_block}

${template.transformed_parameters_block || ''}

${template.model_block}

${template.generated_quantities_block || ''}
`.trim();
}

/**
 * Get model template based on family
 */
function getModelTemplate(spec: ModelSpecification): StanModelTemplate {
  switch (spec.model_family) {
    case 'rasch_1pl':
      return getRaschTemplate(spec);
    case 'irt_1pl_common_slope':
      return get1PLTemplate();
    case 'irt_2pl':
      return get2PLTemplate();
    case 'irt_3pl':
      return get3PLTemplate();
    case 'irt_4pl':
      return get4PLTemplate();
    case 'irt_5pl':
      return get5PLTemplate();
    case 'grm':
      return getGRMTemplate();
    case 'gpcm':
      return getGPCMTemplate();
    case 'pcm':
      return getPCMTemplate();
    case 'nrm':
      return getNRMTemplate();
    default:
      throw new Error(`Model family ${spec.model_family} not yet implemented`);
  }
}

/**
 * Rasch (1PL with fixed discrimination a=1)
 */
function getRaschTemplate(spec: ModelSpecification): StanModelTemplate {
  const identification = spec.identification;
  const thetaMean = identification?.theta_mean ?? 0;
  const thetaSd = identification?.theta_sd ?? 1;
  const thetaPrior = identification?.strategy === 'fix_theta_variance'
    ? `theta ~ normal(${thetaMean}, ${thetaSd});`
    : `theta ~ normal(${thetaMean}, prior_theta_sd);`;
  const difficultyConstraint = identification?.strategy === 'fix_item_mean'
    ? '\n  // Soft constraint to center difficulty for identification\n  target += normal_lpdf(mean(difficulty) | 0, 0.001);'
    : '';
  return {
    data_block: `
data {
  int<lower=1> N;              // number of responses
  int<lower=1> I;              // number of items
  int<lower=1> J;              // number of persons
  array[N] int<lower=1,upper=I> ii;  // item for response n
  array[N] int<lower=1,upper=J> jj;  // person for response n
  array[N] int<lower=0,upper=1> y;   // response for response n
  
  // Priors
  real prior_difficulty_mean;
  real<lower=0> prior_difficulty_sd;
  real<lower=0> prior_theta_sd;
}`,
    parameters_block: `
parameters {
  vector[I] difficulty;        // item difficulty (b)
  vector[J] theta;             // person ability
}`,
    model_block: `
model {
  // Priors
  difficulty ~ normal(prior_difficulty_mean, prior_difficulty_sd);
  ${thetaPrior}${difficultyConstraint}
  
  // Likelihood (Rasch model with discrimination fixed at 1)
  for (n in 1:N) {
    y[n] ~ bernoulli_logit(theta[jj[n]] - difficulty[ii[n]]);
  }
}`,
    generated_quantities_block: `
generated_quantities {
  vector[N] log_lik;
  array[N] int y_rep;
  
  for (n in 1:N) {
    real eta = theta[jj[n]] - difficulty[ii[n]];
    log_lik[n] = bernoulli_logit_lpmf(y[n] | eta);
    y_rep[n] = bernoulli_logit_rng(eta);
  }
}`
  };
}

/**
 * 1PL with common (estimated) discrimination
 */
function get1PLTemplate(): StanModelTemplate {
  return {
    data_block: `
data {
  int<lower=1> N;
  int<lower=1> I;
  int<lower=1> J;
  array[N] int<lower=1,upper=I> ii;
  array[N] int<lower=1,upper=J> jj;
  array[N] int<lower=0,upper=1> y;
  
  // Priors
  real prior_discrimination_mean;
  real<lower=0> prior_discrimination_sd;
  real prior_difficulty_mean;
  real<lower=0> prior_difficulty_sd;
  real<lower=0> prior_theta_sd;
}`,
    parameters_block: `
parameters {
  real<lower=0> discrimination;  // common discrimination (a)
  vector[I] difficulty;          // item difficulties (b)
  vector[J] theta;               // person abilities
}`,
    model_block: `
model {
  // Priors
  discrimination ~ lognormal(prior_discrimination_mean, prior_discrimination_sd);
  difficulty ~ normal(prior_difficulty_mean, prior_difficulty_sd);
  theta ~ normal(0, prior_theta_sd);
  
  // Likelihood (1PL with common discrimination)
  for (n in 1:N) {
    y[n] ~ bernoulli_logit(discrimination * (theta[jj[n]] - difficulty[ii[n]]));
  }
}`,
    generated_quantities_block: `
generated_quantities {
  vector[N] log_lik;
  array[N] int y_rep;
  
  for (n in 1:N) {
    real eta = discrimination * (theta[jj[n]] - difficulty[ii[n]]);
    log_lik[n] = bernoulli_logit_lpmf(y[n] | eta);
    y_rep[n] = bernoulli_logit_rng(eta);
  }
}`
  };
}

/**
 * 2PL model
 */
function get2PLTemplate(): StanModelTemplate {
  return {
    data_block: `
data {
  int<lower=1> N;
  int<lower=1> I;
  int<lower=1> J;
  array[N] int<lower=1,upper=I> ii;
  array[N] int<lower=1,upper=J> jj;
  array[N] int<lower=0,upper=1> y;
  
  // Priors
  real prior_discrimination_mean;
  real<lower=0> prior_discrimination_sd;
  real prior_difficulty_mean;
  real<lower=0> prior_difficulty_sd;
  real<lower=0> prior_theta_sd;
}`,
    parameters_block: `
parameters {
  vector<lower=0>[I] discrimination;  // item discriminations (a)
  vector[I] difficulty;               // item difficulties (b)
  vector[J] theta;                    // person abilities
}`,
    model_block: `
model {
  // Priors
  discrimination ~ lognormal(prior_discrimination_mean, prior_discrimination_sd);
  difficulty ~ normal(prior_difficulty_mean, prior_difficulty_sd);
  theta ~ normal(0, prior_theta_sd);
  
  // Likelihood (2PL model)
  for (n in 1:N) {
    y[n] ~ bernoulli_logit(discrimination[ii[n]] * (theta[jj[n]] - difficulty[ii[n]]));
  }
}`,
    generated_quantities_block: `
generated_quantities {
  vector[N] log_lik;
  array[N] int y_rep;
  
  for (n in 1:N) {
    real eta = discrimination[ii[n]] * (theta[jj[n]] - difficulty[ii[n]]);
    log_lik[n] = bernoulli_logit_lpmf(y[n] | eta);
    y_rep[n] = bernoulli_logit_rng(eta);
  }
}`
  };
}

/**
 * 3PL model (with guessing parameter)
 */
function get3PLTemplate(): StanModelTemplate {
  return {
    data_block: `
data {
  int<lower=1> N;
  int<lower=1> I;
  int<lower=1> J;
  array[N] int<lower=1,upper=I> ii;
  array[N] int<lower=1,upper=J> jj;
  array[N] int<lower=0,upper=1> y;
  
  // Priors
  real prior_discrimination_mean;
  real<lower=0> prior_discrimination_sd;
  real prior_difficulty_mean;
  real<lower=0> prior_difficulty_sd;
  real<lower=0> prior_theta_sd;
  real<lower=0> prior_guessing_alpha;
  real<lower=0> prior_guessing_beta;
}`,
    parameters_block: `
parameters {
  vector<lower=0>[I] discrimination;      // item discriminations (a)
  vector[I] difficulty;                   // item difficulties (b)
  vector<lower=0,upper=1>[I] guessing;    // guessing parameters (c)
  vector[J] theta;                        // person abilities
}`,
    model_block: `
model {
  // Priors
  discrimination ~ lognormal(prior_discrimination_mean, prior_discrimination_sd);
  difficulty ~ normal(prior_difficulty_mean, prior_difficulty_sd);
  guessing ~ beta(prior_guessing_alpha, prior_guessing_beta);
  theta ~ normal(0, prior_theta_sd);
  
  // Likelihood (3PL model)
  for (n in 1:N) {
    real eta = discrimination[ii[n]] * (theta[jj[n]] - difficulty[ii[n]]);
    real p = guessing[ii[n]] + (1 - guessing[ii[n]]) * inv_logit(eta);
    y[n] ~ bernoulli(p);
  }
}`,
    generated_quantities_block: `
generated_quantities {
  vector[N] log_lik;
  array[N] int y_rep;
  
  for (n in 1:N) {
    real eta = discrimination[ii[n]] * (theta[jj[n]] - difficulty[ii[n]]);
    real p = guessing[ii[n]] + (1 - guessing[ii[n]]) * inv_logit(eta);
    log_lik[n] = bernoulli_lpmf(y[n] | p);
    y_rep[n] = bernoulli_rng(p);
  }
}`
  };
}

/**
 * Graded Response Model (GRM) for ordinal items
 */
function getGRMTemplate(): StanModelTemplate {
  return {
    data_block: `
data {
  int<lower=1> N;                    // number of responses
  int<lower=1> I;                    // number of items
  int<lower=1> J;                    // number of persons
  int<lower=2> K;                    // number of categories
  array[N] int<lower=1,upper=I> ii;  // item for response n
  array[N] int<lower=1,upper=J> jj;  // person for response n
  array[N] int<lower=1,upper=K> y;   // response for response n
  
  // Priors
  real prior_discrimination_mean;
  real<lower=0> prior_discrimination_sd;
  real<lower=0> prior_theta_sd;
}`,
    parameters_block: `
parameters {
  vector<lower=0>[I] discrimination;        // item discriminations (a)
  array[I] ordered[K-1] thresholds;        // item thresholds (ordered)
  vector[J] theta;                         // person abilities
}`,
    model_block: `
model {
  // Priors
  discrimination ~ lognormal(prior_discrimination_mean, prior_discrimination_sd);
  theta ~ normal(0, prior_theta_sd);
  
  for (i in 1:I) {
    thresholds[i] ~ normal(0, 2);  // Diffuse prior on thresholds
  }
  
  // Likelihood (GRM)
  for (n in 1:N) {
    y[n] ~ ordered_logistic(discrimination[ii[n]] * theta[jj[n]], thresholds[ii[n]]);
  }
}`,
    generated_quantities_block: `
generated_quantities {
  vector[N] log_lik;
  array[N] int y_rep;
  
  for (n in 1:N) {
    log_lik[n] = ordered_logistic_lpmf(y[n] | discrimination[ii[n]] * theta[jj[n]], thresholds[ii[n]]);
    y_rep[n] = ordered_logistic_rng(discrimination[ii[n]] * theta[jj[n]], thresholds[ii[n]]);
  }
}`
  };
}

/**
 * Generalized Partial Credit Model (GPCM)
 */
function getGPCMTemplate(): StanModelTemplate {
  return {
    data_block: `
data {
  int<lower=1> N;
  int<lower=1> I;
  int<lower=1> J;
  int<lower=2> K;
  array[N] int<lower=1,upper=I> ii;
  array[N] int<lower=1,upper=J> jj;
  array[N] int<lower=1,upper=K> y;
  
  // Priors
  real prior_discrimination_mean;
  real<lower=0> prior_discrimination_sd;
  real<lower=0> prior_theta_sd;
}`,
    parameters_block: `
parameters {
  vector<lower=0>[I] discrimination;     // item discriminations
  array[I] vector[K-1] step_difficulty;  // step difficulties
  vector[J] theta;                       // person abilities
}`,
    model_block: `
model {
  // Priors
  discrimination ~ lognormal(prior_discrimination_mean, prior_discrimination_sd);
  theta ~ normal(0, prior_theta_sd);
  
  for (i in 1:I) {
    step_difficulty[i] ~ normal(0, 2);
  }
  
  // Likelihood (GPCM)
  for (n in 1:N) {
    vector[K] category_logits;
    category_logits[1] = 0;
    
    for (k in 2:K) {
      category_logits[k] = discrimination[ii[n]] * (k - 1) * theta[jj[n]] 
                          - sum(step_difficulty[ii[n]][1:(k-1)]);
    }
    
    y[n] ~ categorical_logit(category_logits);
  }
}`,
    generated_quantities_block: `
generated_quantities {
  vector[N] log_lik;
  array[N] int y_rep;
  
  for (n in 1:N) {
    vector[K] category_logits;
    category_logits[1] = 0;
    
    for (k in 2:K) {
      category_logits[k] = discrimination[ii[n]] * (k - 1) * theta[jj[n]] 
                          - sum(step_difficulty[ii[n]][1:(k-1)]);
    }
    
    log_lik[n] = categorical_logit_lpmf(y[n] | category_logits);
    y_rep[n] = categorical_logit_rng(category_logits);
  }
}`
  };
}

function getPCMTemplate(): StanModelTemplate {
  throw new Error('PCM template is not implemented yet.');
}

function getNRMTemplate(): StanModelTemplate {
  throw new Error('NRM template is not implemented yet.');
}

function get4PLTemplate(): StanModelTemplate {
  throw new Error('4PL template is not implemented yet.');
}

function get5PLTemplate(): StanModelTemplate {
  throw new Error('5PL template is not implemented yet.');
}

/**
 * Get default priors for a model family.
 *
 * Default priors are weakly informative:
 * - theta_sd: 1.0 (standard normal abilities)
 * - difficulty: N(0, 2) (covers typical difficulty ranges)
 * - discrimination: LogNormal(0, 1) (median=1, supports ~[0.1, 10])
 * - guessing (3PL): Beta(5, 17) (mean~0.23, suitable for 4-option items)
 *
 * Users should adjust priors based on their context and item types.
 */
export function getDefaultPriors(family: IRTModelFamily): { [key: string]: number } {
  const defaults: { [key: string]: number } = {
    prior_theta_sd: 1.0,
    prior_difficulty_mean: 0.0,
    prior_difficulty_sd: 2.0
  };

  if (family !== 'rasch_1pl') {
    defaults.prior_discrimination_mean = 0.0;  // lognormal(0, 1) gives median=1
    defaults.prior_discrimination_sd = 1.0;
  }

  if (family === 'irt_3pl') {
    defaults.prior_guessing_alpha = 5.0;  // beta(5, 17) gives mean≈0.23
    defaults.prior_guessing_beta = 17.0;
  }

  return defaults;
}
