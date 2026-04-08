import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Activity,
  BarChart3,
  MessageSquare,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Radar,
  ScanLine,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { KPICard } from './components/KPICard';
import { OrgHierarchy } from './components/OrgHierarchy';
import { MonthlyTrendChart, ProfitBarChart, ExpensePieChart } from './components/FinancialCharts';
import { ChatInterface } from './components/ChatInterface';
import { fetchDashboardData } from './lib/api';
import type { DashboardSummary } from './types';

type Tab = 'dashboard' | 'chat';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-slate-800/60 rounded-xl p-5 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-200 dark:bg-slate-800/60 rounded-xl p-5 h-80" />
        <div className="bg-gray-200 dark:bg-slate-800/60 rounded-xl p-5 h-80" />
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { isDark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <ScanLine size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-gray-900 dark:text-white font-bold text-lg leading-tight">AI CFO Dashboard</h1>
                <p className="text-gray-400 dark:text-slate-500 text-xs">Robotic Imaging Financial Intelligence</p>
              </div>
            </div>

            {/* Right side: nav + theme toggle */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={16} />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare size={16} />
                  AI CFO
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">Live</span>
                </button>
              </nav>

              {/* Theme toggle button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-200"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium">Failed to load dashboard data</p>
            <p className="text-xs mt-1 font-mono">{error}</p>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {loading ? (
              <LoadingSkeleton />
            ) : data ? (
              <div className="space-y-6">

                {/* Budget Overrun Alerts */}
                {data.budget_alerts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400" />
                      <span className="text-amber-700 dark:text-amber-400 font-semibold text-sm">
                        {data.budget_alerts.length} Budget Alert{data.budget_alerts.length > 1 ? 's' : ''} — Projects approaching or exceeding budget
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.budget_alerts.map((alert) => (
                        <div
                          key={alert.project_name}
                          className={`text-xs px-3 py-1.5 rounded-full border ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-300'
                              : 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300'
                          }`}
                        >
                          {alert.project_name} — {alert.utilization_pct.toFixed(0)}% of budget used
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPI Row 1 — Core Financials */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 font-medium">Core Financials</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      title="Total Revenue"
                      value={formatCurrency(data.total_revenue)}
                      icon={<DollarSign size={20} />}
                      trend="up"
                      trendValue="24-month total"
                      subtitle="all organizations"
                    />
                    <KPICard
                      title="Total Expenses"
                      value={formatCurrency(data.total_expenses)}
                      icon={<TrendingDown size={20} />}
                      trend="neutral"
                      subtitle="travel + equipment"
                    />
                    <KPICard
                      title="Net Profit"
                      value={formatCurrency(data.net_profit)}
                      icon={<TrendingUp size={20} />}
                      trend={data.net_profit >= 0 ? 'up' : 'down'}
                      trendValue={`${data.profit_margin.toFixed(1)}% margin`}
                    />
                    <KPICard
                      title="Active Projects"
                      value={String(data.active_projects)}
                      icon={<Building2 size={20} />}
                      subtitle={`across ${data.total_organizations} organizations`}
                    />
                  </div>
                </div>

                {/* KPI Row 2 — Operational Intelligence */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 font-medium">Operational Intelligence</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      title="Monthly Burn Rate"
                      value={formatCurrency(data.monthly_burn_rate)}
                      icon={<Flame size={20} />}
                      trend="neutral"
                      subtitle="avg expenses / mo (last 6mo)"
                    />
                    <KPICard
                      title="Avg Revenue / Survey"
                      value={formatCurrency(data.avg_revenue_per_survey)}
                      icon={<Radar size={20} />}
                      trend="up"
                      subtitle="per lidar survey conducted"
                    />
                    <KPICard
                      title="MoM Revenue Growth"
                      value={`${data.mom_revenue_growth_pct >= 0 ? '+' : ''}${data.mom_revenue_growth_pct.toFixed(1)}%`}
                      icon={
                        data.mom_revenue_growth_pct >= 0
                          ? <ArrowUpRight size={20} />
                          : <ArrowDownRight size={20} />
                      }
                      trend={data.mom_revenue_growth_pct >= 0 ? 'up' : 'down'}
                      subtitle="vs prior month"
                    />
                    <KPICard
                      title="Expense Anomalies"
                      value={String(data.anomaly_count)}
                      icon={<Activity size={20} />}
                      trend={data.anomaly_count > 0 ? 'down' : 'up'}
                      trendValue={data.anomaly_count > 0 ? 'Needs review' : 'All clear'}
                      subtitle="non-standard categories detected"
                    />
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MonthlyTrendChart data={data.monthly_trends} />
                  <ProfitBarChart data={data.monthly_trends} />
                </div>

                {/* Expense Breakdown + Org Hierarchy */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <ExpensePieChart data={data.expense_breakdown} />
                  <div className="lg:col-span-2">
                    <OrgHierarchy orgs={data.org_financials} projects={data.project_financials} />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Financial Analyst</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                Queries your Supabase database in real-time using Gemini function calling.
                Ask about profitability, travel cost trends, forecasts, or run a full fraud audit.
              </p>
            </div>
            <ChatInterface />
          </div>
        )}
      </main>
    </div>
  );
}
