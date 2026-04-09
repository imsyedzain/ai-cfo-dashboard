/**
 * Financial calculation utilities for profit margins, growth rates, and rounding
 */

import { FINANCIAL_DECIMAL_PLACES } from './constants';

/**
 * Rounds a number to a specified number of decimal places
 * @param value - The number to round
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Rounded number
 * @example roundToDecimalPlaces(3.14159, 2) // 3.14
 */
export function roundToDecimalPlaces(
  value: number,
  decimalPlaces: number = FINANCIAL_DECIMAL_PLACES
): number {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Calculates profit margin as a percentage
 * Formula: (Net Profit / Total Revenue) × 100
 * @param netProfit - Net profit amount (revenue - expenses)
 * @param totalRevenue - Total revenue amount
 * @returns Profit margin percentage rounded to 2 decimal places, or 0 if revenue is zero
 * @example calculateProfitMarginPercentage(50000, 200000) // 25.00
 */
export function calculateProfitMarginPercentage(
  netProfit: number,
  totalRevenue: number
): number {
  if (totalRevenue <= 0) return 0;
  const marginPercentage = (netProfit / totalRevenue) * 100;
  return roundToDecimalPlaces(marginPercentage, 2);
}

/**
 * Calculates month-over-month growth rate as a percentage
 * Formula: ((Current - Previous) / Previous) × 100
 * @param previousMonthValue - Value from the previous month
 * @param currentMonthValue - Value from the current month
 * @returns Growth rate percentage rounded to 2 decimal places, or 0 if previous value is zero
 * @example calculateMonthOverMonthGrowth(100000, 115000) // 15.00
 */
export function calculateMonthOverMonthGrowth(
  previousMonthValue: number,
  currentMonthValue: number
): number {
  if (previousMonthValue <= 0) return 0;
  const growthRate = ((currentMonthValue - previousMonthValue) / previousMonthValue) * 100;
  return roundToDecimalPlaces(growthRate, 2);
}

/**
 * Calculates average of an array of numbers
 * @param values - Array of numeric values
 * @returns Average value rounded to 2 decimal places, or 0 if array is empty
 * @example calculateAverage([100, 200, 300]) // 200.00
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return roundToDecimalPlaces(sum / values.length, 2);
}
