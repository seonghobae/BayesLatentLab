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

// TODO(#4): Add diagnostics/fit module and enable the export.
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
 * Build version information string.
 */
export function getVersionString(): string {
  return `${NAME} v${VERSION}`;
}

/**
 * Send version information to a caller-provided logger.
 */
export function printVersion(logger: (message: string) => void): void {
  logger(getVersionString());
}
