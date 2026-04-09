/**
 * Application-wide constants for magic numbers, strings, and configuration values
 */

// ==================== UI Constants ====================

/** Number of skeleton loading cards to display while data loads */
export const SKELETON_CARD_COUNT = 8;

/** Standard height for all charts in pixels */
export const CHART_HEIGHT_PX = 300;

/** Maximum character length before truncating question previews */
export const QUESTION_PREVIEW_LENGTH = 57;

/** Height of the chat messages container */
export const CHAT_CONTAINER_HEIGHT = 'h-[600px]';

/** Initial number of rows for the textarea input */
export const TEXTAREA_INITIAL_ROWS = 1;

// ==================== Business Logic Constants ====================

/** Budget utilization threshold (80%) that triggers a warning alert */
export const BUDGET_WARNING_THRESHOLD = 0.80;

/** Budget utilization threshold (100%) that triggers a critical alert */
export const BUDGET_CRITICAL_THRESHOLD = 1.00;

/** Default number of months to look back for trend analysis */
export const DEFAULT_LOOKBACK_MONTHS = 24;

/** Number of decimal places for financial calculations */
export const FINANCIAL_DECIMAL_PLACES = 2;

// ==================== Chart Constants ====================

/** Stroke width for chart lines */
export const CHART_LINE_STROKE_WIDTH = 2;

/** Dash pattern for chart grid lines */
export const CHART_GRID_DASH_PATTERN = '5 5';

// ==================== Symbol Constants ====================

/** Up arrow symbol for positive trends */
export const UP_ARROW_SYMBOL = '↑';

/** Down arrow symbol for negative trends */
export const DOWN_ARROW_SYMBOL = '↓';

// ==================== Storage Keys ====================

/** LocalStorage key for storing theme preference */
export const THEME_STORAGE_KEY = 'cfo-theme';

/** Special ID for the welcome message in chat */
export const WELCOME_MESSAGE_ID = 'welcome';

// ==================== Margin Health Thresholds ====================

/** Profit margin percentage considered healthy (40%+) */
export const HEALTHY_MARGIN_THRESHOLD = 40;

/** Profit margin percentage that triggers a warning (20-40%) */
export const WARNING_MARGIN_THRESHOLD = 20;
