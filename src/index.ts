/**
 * BayesLatentLab - Main entry point
 * 
 * Bayesian Multilevel IRT/CFA/EFA + Test Equating/Linking + DIF + LD Analysis Tool
 */

// Export types
export * from './types/index.js';

// Export data validation
export * from './data/validation.js';

// Export model specification
export * from './models/specification.js';

// Export Stan templates
export * from './stan/templates.js';

// Export DIF analysis
export * from './dif/analysis.js';

// Export equating/linking
export * from './equating/linking.js';

// Note: diagnostics module will be added in future version
// export * from './diagnostics/fit.js';

/**
 * Main analysis workflow
 */
export { runAnalysis } from './workflow.js';

/**
 * Version information
 */
export const VERSION = '0.1.0';
export const NAME = 'BayesLatentLab';

/**
 * Print version information to console.
 * Call this function explicitly if you need to log version info.
 */
export function printVersion(): void {
  console.log(`${NAME} v${VERSION}`);
}
