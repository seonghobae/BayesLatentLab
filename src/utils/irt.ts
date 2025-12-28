/**
 * Utility functions for BayesLatentLab
 */

/**
 * Calculate ICC (Item Characteristic Curve) values
 */
export function calculateICC(
  theta: number,
  discrimination: number,
  difficulty: number,
  guessing: number = 0,
  upperAsymptote: number = 1
): number {
  const eta = discrimination * (theta - difficulty);
  const logistic = 1 / (1 + Math.exp(-eta));
  return guessing + (upperAsymptote - guessing) * logistic;
}

/**
 * Calculate TCC (Test Characteristic Curve) - sum of ICCs
 */
export function calculateTCC(
  theta: number,
  items: Array<{
    discrimination: number;
    difficulty: number;
    guessing?: number;
    upperAsymptote?: number;
  }>
): number {
  return items.reduce((sum, item) => {
    return sum + calculateICC(
      theta,
      item.discrimination,
      item.difficulty,
      item.guessing || 0,
      item.upperAsymptote || 1
    );
  }, 0);
}

/**
 * Calculate item information
 */
export function calculateItemInformation(
  theta: number,
  discrimination: number,
  difficulty: number
): number {
  const p = calculateICC(theta, discrimination, difficulty);
  return discrimination * discrimination * p * (1 - p);
}

/**
 * Calculate test information
 */
export function calculateTestInformation(
  theta: number,
  items: Array<{ discrimination: number; difficulty: number }>
): number {
  return items.reduce((sum, item) => {
    return sum + calculateItemInformation(theta, item.discrimination, item.difficulty);
  }, 0);
}

/**
 * Calculate standard error of measurement
 */
export function calculateSEM(
  theta: number,
  items: Array<{ discrimination: number; difficulty: number }>
): number {
  const information = calculateTestInformation(theta, items);
  return information > 0 ? 1 / Math.sqrt(information) : Infinity;
}

/**
 * Calculate expected score for GRM
 */
export function calculateGRMExpectedScore(
  theta: number,
  discrimination: number,
  thresholds: number[]
): number {
  const K = thresholds.length + 1;
  let expectedScore = 0;

  for (let k = 0; k < K; k++) {
    let p: number;
    
    if (k === 0) {
      // P(Y >= 1) - P(Y >= 2)
      p = 1 - (1 / (1 + Math.exp(-(discrimination * theta - thresholds[0]))));
    } else if (k === K - 1) {
      // P(Y >= K)
      p = 1 / (1 + Math.exp(-(discrimination * theta - thresholds[k - 1])));
    } else {
      // P(Y >= k) - P(Y >= k+1)
      const pGEk = 1 / (1 + Math.exp(-(discrimination * theta - thresholds[k - 1])));
      const pGEk1 = 1 / (1 + Math.exp(-(discrimination * theta - thresholds[k])));
      p = pGEk - pGEk1;
    }
    
    expectedScore += (k + 1) * p;
  }

  return expectedScore;
}

/**
 * Generate theta grid for plotting
 */
export function generateThetaGrid(
  min: number = -3,
  max: number = 3,
  steps: number = 61
): number[] {
  const grid: number[] = [];
  const stepSize = (max - min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    grid.push(min + i * stepSize);
  }
  
  return grid;
}

/**
 * Transform parameters from one scale to another
 */
export function transformParameters(
  params: { discrimination: number; difficulty: number },
  slope: number,
  intercept: number
): { discrimination: number; difficulty: number } {
  return {
    discrimination: params.discrimination / slope,
    difficulty: slope * params.difficulty + intercept
  };
}

/**
 * Calculate raw score to theta mapping
 */
export function rawScoreToTheta(
  rawScore: number,
  items: Array<{ discrimination: number; difficulty: number }>,
  maxIterations: number = 100,
  tolerance: number = 0.001
): number {
  // Newton-Raphson iteration
  let theta = 0; // Initial guess
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let expectedScore = 0;
    let information = 0;
    
    items.forEach(item => {
      const p = calculateICC(theta, item.discrimination, item.difficulty);
      expectedScore += p;
      information += calculateItemInformation(theta, item.discrimination, item.difficulty);
    });
    
    const diff = rawScore - expectedScore;
    
    if (Math.abs(diff) < tolerance) {
      return theta;
    }
    
    if (information > 0) {
      theta += diff / information;
    } else {
      break;
    }
  }
  
  return theta;
}

/**
 * Calculate reliability coefficient
 */
export function calculateReliability(
  thetas: number[],
  items: Array<{ discrimination: number; difficulty: number }>
): number {
  const n = thetas.length;
  if (n < 2) return 0;

  // Calculate true score variance
  const trueScores = thetas.map(theta => calculateTCC(theta, items));
  const meanTrue = trueScores.reduce((a, b) => a + b, 0) / n;
  const varTrue = trueScores.reduce((a, b) => a + Math.pow(b - meanTrue, 2), 0) / (n - 1);

  // Calculate error variance
  const errorVars = thetas.map(theta => {
    const sem = calculateSEM(theta, items);
    return sem * sem;
  });
  const meanErrorVar = errorVars.reduce((a, b) => a + b, 0) / n;

  // Reliability = true variance / (true variance + error variance)
  const totalVar = varTrue + meanErrorVar;
  return totalVar > 0 ? varTrue / totalVar : 0;
}

/**
 * Format parameter summary for display
 */
export function formatParameterSummary(
  param: {
    mean: number;
    sd: number;
    q025: number;
    q975: number;
    rhat: number;
    ess_bulk: number;
  },
  decimals: number = 3
): string {
  return [
    `Mean: ${param.mean.toFixed(decimals)}`,
    `SD: ${param.sd.toFixed(decimals)}`,
    `95% CI: [${param.q025.toFixed(decimals)}, ${param.q975.toFixed(decimals)}]`,
    `Rhat: ${param.rhat.toFixed(3)}`,
    `ESS: ${Math.round(param.ess_bulk)}`
  ].join(', ');
}

/**
 * Check convergence based on Rhat and ESS
 */
export function checkConvergence(
  rhat: number,
  essBulk: number,
  essTail: number,
  rhatThreshold: number = 1.01,
  essThreshold: number = 400
): { converged: boolean; issues: string[] } {
  const issues: string[] = [];

  if (rhat > rhatThreshold) {
    issues.push(`Rhat (${rhat.toFixed(3)}) exceeds threshold (${rhatThreshold})`);
  }

  if (essBulk < essThreshold) {
    issues.push(`ESS bulk (${Math.round(essBulk)}) below threshold (${essThreshold})`);
  }

  if (essTail < essThreshold) {
    issues.push(`ESS tail (${Math.round(essTail)}) below threshold (${essThreshold})`);
  }

  return {
    converged: issues.length === 0,
    issues
  };
}
