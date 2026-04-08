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
  role: 'technician' | 'manager';
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  budget: number;
  status: 'active' | 'completed' | 'on_hold';
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

export interface ProjectFinancials {
  project_id: string;
  project_name: string;
  org_name: string;
  budget: number;
  status: string;
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

export interface TechnicianSpending {
  user_id: string;
  full_name: string;
  total_expenses: number;
  expense_count: number;
  avg_per_expense: number;
  categories: Record<string, number>;
}

export interface AnomalyFlag {
  type: 'duplicate' | 'outlier' | 'policy_violation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  technician: string;
  amount: number;
  date: string;
  category: string;
}

export interface BudgetAlert {
  project_name: string;
  org_name: string;
  budget: number;
  total_expenses: number;
  utilization_pct: number;
  severity: 'critical' | 'warning';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  response: string;
  toolsUsed?: string[];
}
