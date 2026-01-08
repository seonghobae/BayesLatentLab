declare module 'jstat' {
  interface ChiSquareDistribution {
    cdf(statistic: number, df: number): number;
  }

  interface JStatStatic {
    chisquare: ChiSquareDistribution;
  }

  const jStat: JStatStatic;
  export default jStat;
}
