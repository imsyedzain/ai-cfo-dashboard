// ============================================================
// Enums — Type-safe constants for status values
// ============================================================

/**
 * Possible roles for users in the system
 */
export enum UserRole {
  Technician = 'technician',
  Manager = 'manager',
}

/**
 * Project lifecycle statuses
 */
export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
  OnHold = 'on_hold',
}

/**
 * Trend direction indicators for KPIs
 */
export enum TrendDirection {
  Up = 'up',
  Down = 'down',
  Neutral = 'neutral',
}

/**
 * Types of anomalies detected in expense data
 */
export enum AnomalyType {
  Duplicate = 'duplicate',
  Outlier = 'outlier',
  PolicyViolation = 'policy_violation',
}

/**
 * Severity levels for anomalies
 */
export enum AnomalySeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/**
 * Severity levels for budget alerts
 */
export enum BudgetAlertSeverity {
  Warning = 'warning',
  Critical = 'critical',
}

/**
 * Chat message roles
 */
export enum ChatRole {
  User = 'user',
  Assistant = 'assistant',
}

// ============================================================
// Domain Types — mirrors the Supabase relational schema
// ============================================================

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  budget: number;
  status: ProjectStatus;
  start_date: string;
}

export interface Revenue {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  date: string;
}

export interface Expense {
  id: string;
  project_id: string;
  user_id: string | null;
  amount: number;
  category: string;
  date: string;
}

// ============================================================
// Computed / Aggregated Types for the Dashboard
// ============================================================

/**
 * Financial summary for a single project
 * Includes revenue, expenses, margins, and budget utilization
 */
export interface ProjectFinancials {
  project_id: string;
  project_name: string;
  org_name: string;
  budget: number;
  status: ProjectStatus;
  total_revenue: number;
  total_expenses: number;
  net_margin: number;
  margin_percentage: number;
  budget_utilization: number;
}

export interface OrgFinancials {
  org_id: string;
  org_name: string;
  project_count: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ExpenseByCategory {
  category: string;
  total: number;
  percentage: number;
}

/**
 * Category-wise expense breakdown for a technician
 * Maps expense category names to total amounts spent
 */
export interface CategoryExpenseMap {
  [category: string]: number;
}

/**
 * Spending summary for a single technician
 * Includes total expenses and per-category breakdown
 */
export interface TechnicianSpending {
  user_id: string;
  full_name: string;
  total_expenses: number;
  expense_count: number;
  avg_per_expense: number;
  categories: CategoryExpenseMap;
}

/**
 * Detected anomaly in expense data
 * Can be duplicate billing, statistical outlier, or policy violation
 */
export interface AnomalyFlag {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  technician: string;
  amount: number;
  date: string;
  category: string;
}

/**
 * Budget overrun alert for a project
 * Triggered when expenses exceed threshold percentages
 */
export interface BudgetAlert {
  project_name: string;
  org_name: string;
  budget: number;
  total_expenses: number;
  utilization_pct: number;
  severity: BudgetAlertSeverity;
}

export interface DashboardSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  active_projects: number;
  total_organizations: number;
  avg_project_margin: number;
  // Senior-level business KPIs
  monthly_burn_rate: number;
  avg_revenue_per_survey: number;
  mom_revenue_growth_pct: number;
  anomaly_count: number;
  budget_alerts: BudgetAlert[];
  monthly_trends: MonthlyTrend[];
  expense_breakdown: ExpenseByCategory[];
  org_financials: OrgFinancials[];
  project_financials: ProjectFinancials[];
}

// ============================================================
// Chat Types
// ============================================================

/**
 * Message in the chat conversation
 * Can be from user or AI assistant
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  /** True when waiting for AI response */
  isLoading?: boolean;
}

/**
 * Simplified conversation history entry for API requests
 */
export interface ConversationHistoryEntry {
  role: string;
  content: string;
}

/**
 * Request payload for chat API
 */
export interface ChatRequest {
  message: string;
  conversationHistory?: ConversationHistoryEntry[];
}

/**
 * Response from chat API including AI-generated text and tools used
 */
export interface ChatResponse {
  response: string;
  toolsUsed?: string[];
}
