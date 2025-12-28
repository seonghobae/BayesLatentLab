/**
 * BayesLatentLab - Main entry point
 * 
 * Bayesian Multilevel IRT/CFA/EFA + Test Equating/Linking + DIF + LD Analysis Tool
 */

// Export types
export * from './types';

// Export data validation
export * from './data/validation';

// Export model specification
export * from './models/specification';

// Export Stan templates
export * from './stan/templates';

// Export DIF analysis
export * from './dif/analysis';

// Export equating/linking
export * from './equating/linking';

// Export diagnostics
export * from './diagnostics/fit';

/**
 * Main analysis workflow
 */
export { runAnalysis } from './workflow';

/**
 * Version information
 */
export const VERSION = '0.1.0';
export const NAME = 'BayesLatentLab';

console.log(`${NAME} v${VERSION} loaded successfully`);
