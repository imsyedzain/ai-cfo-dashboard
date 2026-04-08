import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parallel fetch all core data
    const [orgsResult, projectsResult, revenueResult, expensesResult] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('revenue').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    if (orgsResult.error) throw orgsResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (revenueResult.error) throw revenueResult.error;
    if (expensesResult.error) throw expensesResult.error;

    const orgs = orgsResult.data;
    const projects = projectsResult.data;
    const revenue = revenueResult.data;
    const expenses = expensesResult.data;

    // ---------- Aggregate KPIs ----------
    const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // ---------- Per-Project Financials ----------
    const projectFinancials = projects.map((p) => {
      const projRevenue = revenue
        .filter((r) => r.project_id === p.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const projExpenses = expenses
        .filter((e) => e.project_id === p.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const margin = projRevenue - projExpenses;
      const org = orgs.find((o) => o.id === p.org_id);

      return {
        project_id: p.id,
        project_name: p.name,
        org_name: org?.name ?? 'Unknown',
        budget: Number(p.budget),
        status: p.status,
        total_revenue: projRevenue,
        total_expenses: projExpenses,
        net_margin: margin,
        margin_percentage: projRevenue > 0 ? (margin / projRevenue) * 100 : 0,
        budget_utilization: Number(p.budget) > 0 ? (projExpenses / Number(p.budget)) * 100 : 0,
      };
    });

    // ---------- Per-Org Financials ----------
    const orgFinancials = orgs.map((o) => {
      const orgProjects = projects.filter((p) => p.org_id === o.id);
      const orgProjectIds = new Set(orgProjects.map((p) => p.id));
      const orgRevenue = revenue
        .filter((r) => orgProjectIds.has(r.project_id))
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const orgExpenses = expenses
        .filter((e) => orgProjectIds.has(e.project_id))
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const orgProfit = orgRevenue - orgExpenses;

      return {
        org_id: o.id,
        org_name: o.name,
        project_count: orgProjects.length,
        total_revenue: orgRevenue,
        total_expenses: orgExpenses,
        net_profit: orgProfit,
        profit_margin: orgRevenue > 0 ? (orgProfit / orgRevenue) * 100 : 0,
      };
    });

    // ---------- Monthly Trends (last 24 months) ----------
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();

    for (const r of revenue) {
      const key = r.date.substring(0, 7); // YYYY-MM
      const entry = monthlyMap.get(key) ?? { revenue: 0, expenses: 0 };
      entry.revenue += Number(r.amount);
      monthlyMap.set(key, entry);
    }

    for (const e of expenses) {
      const key = e.date.substring(0, 7);
      const entry = monthlyMap.get(key) ?? { revenue: 0, expenses: 0 };
      entry.expenses += Number(e.amount);
      monthlyMap.set(key, entry);
    }

    const monthlyTrends = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round((data.revenue - data.expenses) * 100) / 100,
      }));

    // ---------- Expense Breakdown by Category ----------
    const categoryMap = new Map<string, number>();
    for (const e of expenses) {
      const current = categoryMap.get(e.category) ?? 0;
      categoryMap.set(e.category, current + Number(e.amount));
    }

    const expenseBreakdown = Array.from(categoryMap.entries())
      .map(([category, total]) => ({
        category,
        total: Math.round(total * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ---------- Senior KPI: Monthly Burn Rate (avg monthly expenses, last 6 mo) ----------
    const last6Months = monthlyTrends.slice(-6);
    const monthlyBurnRate =
      last6Months.length > 0
        ? Math.round((last6Months.reduce((s, m) => s + m.expenses, 0) / last6Months.length) * 100) / 100
        : 0;

    // ---------- Senior KPI: Avg Revenue Per Survey ----------
    const avgRevenuePerSurvey =
      revenue.length > 0 ? Math.round((totalRevenue / revenue.length) * 100) / 100 : 0;

    // ---------- Senior KPI: Month-over-Month Revenue Growth ----------
    const lastTwo = monthlyTrends.slice(-2);
    const momRevenueGrowthPct =
      lastTwo.length === 2 && lastTwo[0].revenue > 0
        ? Math.round(((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 10000) / 100
        : 0;

    // ---------- Senior KPI: Budget Overrun Alerts ----------
    const budgetAlerts = projectFinancials
      .filter((p) => p.budget_utilization >= 80)
      .map((p) => ({
        project_name: p.project_name,
        org_name: p.org_name,
        budget: p.budget,
        total_expenses: p.total_expenses,
        utilization_pct: p.budget_utilization,
        severity: p.budget_utilization >= 100 ? ('critical' as const) : ('warning' as const),
      }))
      .sort((a, b) => b.utilization_pct - a.utilization_pct);

    // ---------- Senior KPI: Anomaly Count (non-standard categories) ----------
    const standardCategories = new Set(['Flight', 'Hotel', 'Meals', 'Equipment']);
    const anomalyCount = expenses.filter((e) => !standardCategories.has(e.category)).length;

    const summary = {
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      profit_margin: Math.round(profitMargin * 100) / 100,
      active_projects: projects.filter((p) => p.status === 'active').length,
      total_organizations: orgs.length,
      avg_project_margin:
        projectFinancials.length > 0
          ? Math.round(
              (projectFinancials.reduce((sum, p) => sum + p.margin_percentage, 0) /
                projectFinancials.length) *
                100
            ) / 100
          : 0,
      monthly_burn_rate: monthlyBurnRate,
      avg_revenue_per_survey: avgRevenuePerSurvey,
      mom_revenue_growth_pct: momRevenueGrowthPct,
      anomaly_count: anomalyCount,
      budget_alerts: budgetAlerts,
      monthly_trends: monthlyTrends,
      expense_breakdown: expenseBreakdown,
      org_financials: orgFinancials,
      project_financials: projectFinancials,
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
