// Basic financial calculations

export function roundToDecimalPlaces(value: number, decimalPlaces: number = 2): number {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(value * multiplier) / multiplier;
}

export function calculateProfitMarginPercentage(netProfit: number, totalRevenue: number): number {
  if (totalRevenue <= 0) return 0;
  return roundToDecimalPlaces((netProfit / totalRevenue) * 100, 2);
}

export function calculateMonthOverMonthGrowth(prevValue: number, currentValue: number): number {
  if (prevValue <= 0) return 0;
  return roundToDecimalPlaces(((currentValue - prevValue) / prevValue) * 100, 2);
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return roundToDecimalPlaces(sum / values.length, 2);
}
