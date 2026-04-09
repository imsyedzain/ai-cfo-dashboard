/**
 * Design tokens and theme configuration for consistent styling
 */

// ==================== Chart Color Palette ====================

/**
 * Standard color palette for data visualization charts
 * Used in pie charts, bar charts, and multi-line graphs
 */
export const CHART_COLORS = {
  primary: '#3b82f6',    // Blue
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Amber
  danger: '#ef4444',     // Red
  purple: '#8b5cf6',     // Purple
  pink: '#ec4899',       // Pink
} as const;

/**
 * Array of chart colors for sequential data series
 * Order: Blue, Green, Amber, Red, Purple, Pink
 */
export const CHART_COLOR_ARRAY = Object.values(CHART_COLORS);

// ==================== Status Badge Colors ====================

/**
 * Color mapping for project status badges
 * Maps status values to Tailwind CSS color classes
 */
export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

// ==================== Trend Indicator Colors ====================

/**
 * Color classes for trend indicators (up, down, neutral)
 */
export const TREND_COLORS = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-600 dark:text-gray-400',
} as const;

// ==================== Chart Theme Helpers ====================

/**
 * Checks if the current system theme is in dark mode
 * Used for dynamic chart theming
 * @returns true if dark mode is active, false otherwise
 */
export function isCurrentThemeDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Returns axis styling for charts based on current theme
 */
export function getChartAxisStyle() {
  const isDark = isCurrentThemeDark();
  return { stroke: isDark ? '#4b5563' : '#e5e7eb' };
}

/**
 * Returns grid styling for charts based on current theme
 */
export function getChartGridStyle() {
  const isDark = isCurrentThemeDark();
  return { stroke: isDark ? '#374151' : '#f3f4f6' };
}
