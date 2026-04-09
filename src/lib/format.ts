/**
 * Formatting utilities for currency, numbers, and percentages
 */

/**
 * Formats a number as USD currency with proper thousand separators and cents
 * @param amount - The numeric amount to format
 * @returns Formatted string like "$1,234.56"
 * @example formatCurrency(1234.567) // "$1,234.57"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats large currency amounts in compact form (K for thousands, M for millions)
 * @param amount - The numeric amount to format
 * @returns Compact string like "$1.2M" or "$850K"
 * @example formatCurrencyCompact(1234567) // "$1.2M"
 * @example formatCurrencyCompact(850000) // "$850K"
 */
export function formatCurrencyCompact(amount: number): string {
  const MILLION = 1_000_000;
  const THOUSAND = 1_000;

  if (amount >= MILLION) {
    return `$${(amount / MILLION).toFixed(1)}M`;
  }
  if (amount >= THOUSAND) {
    return `$${Math.round(amount / THOUSAND)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Formats a number as a percentage with configurable decimal places
 * @param value - The numeric value to format (e.g., 0.156 for 15.6%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string like "15.6%"
 * @example formatPercentage(0.156, 1) // "15.6%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
