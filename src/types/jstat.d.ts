declare module 'jstat' {
  export const jStat: {
    chisquare: {
      cdf(statistic: number, df: number): number;
    };
  };
}
