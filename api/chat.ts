import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service key for full DB access
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Tool definitions for Gemini function calling
// These let the AI query our database directly

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_financial_overview',
    description:
      'Get a high-level financial overview across all organizations. Returns total revenue, total expenses, net profit, profit margin, and per-org breakdown.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_project_margins',
    description:
      'Get detailed revenue, expenses, and net margin for each project. Can filter by organization name. Returns project-level profitability data.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        org_name: {
          type: SchemaType.STRING,
          description: 'Optional organization name to filter by (e.g., "Home Depot Field Ops", "7-Eleven Global")',
        },
      },
    },
  },
  {
    name: 'get_expense_trends',
    description:
      'Get monthly expense trends broken down by category (Flight, Hotel, Meals, Equipment). Useful for analyzing cost changes over time and forecasting future expenses.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        months: {
          type: SchemaType.NUMBER,
          description: 'Number of months to look back (default: 24)',
        },
        category: {
          type: SchemaType.STRING,
          description: 'Optional specific expense category to filter (e.g., "Flight", "Hotel", "Equipment")',
        },
      },
    },
  },
  {
    name: 'get_technician_expenses',
    description:
      'Get detailed expense breakdown per technician. Shows total spending, expense count, average per expense, and category breakdown for each technician.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        technician_name: {
          type: SchemaType.STRING,
          description: 'Optional technician name to filter by',
        },
      },
    },
  },
  {
    name: 'detect_expense_anomalies',
    description:
      'Audit technician expenses and detect anomalies including: duplicate billings (same category, similar amount, same date), unusually large purchases (>2x standard deviation), and policy violations (unauthorized categories). Returns flagged items with severity levels.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        months: {
          type: SchemaType.NUMBER,
          description: 'Number of months to audit (default: 12)',
        },
      },
    },
  },
  {
    name: 'get_revenue_by_period',
    description:
      'Get revenue data grouped by month, optionally filtered by organization. Useful for trend analysis and forecasting.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        org_name: {
          type: SchemaType.STRING,
          description: 'Optional organization name filter',
        },
        months: {
          type: SchemaType.NUMBER,
          description: 'Number of months to look back (default: 24)',
        },
      },
    },
  },
  {
    name: 'get_travel_cost_per_survey',
    description:
      'Calculate the average travel cost (flights + hotels + meals) per survey over time. Groups by month to show trend. Essential for forecasting travel expense run-rates.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        months: {
          type: SchemaType.NUMBER,
          description: 'Number of months to analyze (default: 24)',
        },
      },
    },
  },
];

// Tool implementations - each function queries Supabase and returns financial data

async function getFinancialOverview(): Promise<object> {
  const [orgsRes, projectsRes, revenueRes, expensesRes] = await Promise.all([
    supabase.from('organizations').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('revenue').select('*'),
    supabase.from('expenses').select('*'),
  ]);

  const orgs = orgsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const revenue = revenueRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const orgBreakdown = orgs.map((o) => {
    const orgProjectIds = new Set(projects.filter((p) => p.org_id === o.id).map((p) => p.id));
    const orgRev = revenue.filter((r) => orgProjectIds.has(r.project_id)).reduce((s, r) => s + Number(r.amount), 0);
    const orgExp = expenses.filter((e) => orgProjectIds.has(e.project_id)).reduce((s, e) => s + Number(e.amount), 0);
    return {
      org_name: o.name,
      revenue: Math.round(orgRev * 100) / 100,
      expenses: Math.round(orgExp * 100) / 100,
      net_profit: Math.round((orgRev - orgExp) * 100) / 100,
      margin_pct: orgRev > 0 ? Math.round(((orgRev - orgExp) / orgRev) * 10000) / 100 : 0,
      project_count: projects.filter((p) => p.org_id === o.id).length,
    };
  });

  return {
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_expenses: Math.round(totalExpenses * 100) / 100,
    net_profit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
    profit_margin_pct: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 10000) / 100 : 0,
    active_projects: projects.filter((p) => p.status === 'active').length,
    organizations: orgBreakdown,
  };
}

async function getProjectMargins(orgName?: string): Promise<object> {
  const [orgsRes, projectsRes, revenueRes, expensesRes] = await Promise.all([
    supabase.from('organizations').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('revenue').select('*'),
    supabase.from('expenses').select('*'),
  ]);

  const orgs = orgsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const revenue = revenueRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  let filteredProjects = projects;
  if (orgName) {
    const matchingOrg = orgs.find((o) => o.name.toLowerCase().includes(orgName.toLowerCase()));
    if (matchingOrg) {
      filteredProjects = projects.filter((p) => p.org_id === matchingOrg.id);
    }
  }

  return filteredProjects.map((p) => {
    const org = orgs.find((o) => o.id === p.org_id);
    const projRev = revenue.filter((r) => r.project_id === p.id).reduce((s, r) => s + Number(r.amount), 0);
    const projExp = expenses.filter((e) => e.project_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
    const margin = projRev - projExp;
    return {
      project: p.name,
      organization: org?.name ?? 'Unknown',
      budget: Number(p.budget),
      status: p.status,
      revenue: Math.round(projRev * 100) / 100,
      expenses: Math.round(projExp * 100) / 100,
      net_margin: Math.round(margin * 100) / 100,
      margin_pct: projRev > 0 ? Math.round((margin / projRev) * 10000) / 100 : 0,
      budget_utilization_pct: Number(p.budget) > 0 ? Math.round((projExp / Number(p.budget)) * 10000) / 100 : 0,
    };
  });
}

async function getExpenseTrends(months: number = 24, category?: string): Promise<object> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  let query = supabase.from('expenses').select('*').gte('date', cutoffDate.toISOString());
  if (category) {
    query = query.eq('category', category);
  }
  const { data: expenses } = await query;

  const monthlyMap = new Map<string, Map<string, number>>();
  for (const e of expenses ?? []) {
    const monthKey = e.date.substring(0, 7);
    if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, new Map());
    const catMap = monthlyMap.get(monthKey)!;
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));
  }

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, catMap]) => ({
      month,
      categories: Object.fromEntries(
        Array.from(catMap.entries()).map(([cat, total]) => [cat, Math.round(total * 100) / 100])
      ),
      total: Math.round(Array.from(catMap.values()).reduce((s, v) => s + v, 0) * 100) / 100,
    }));
}

async function getTechnicianExpenses(techName?: string): Promise<object> {
  const [usersRes, expensesRes] = await Promise.all([
    supabase.from('users').select('*').eq('role', 'technician'),
    supabase.from('expenses').select('*'),
  ]);

  let techs = usersRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  if (techName) {
    techs = techs.filter((t) => t.full_name.toLowerCase().includes(techName.toLowerCase()));
  }

  return techs.map((t) => {
    const techExpenses = expenses.filter((e) => e.user_id === t.id);
    const categoryTotals = new Map<string, number>();
    for (const e of techExpenses) {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + Number(e.amount));
    }
    const total = techExpenses.reduce((s, e) => s + Number(e.amount), 0);
    return {
      technician: t.full_name,
      email: t.email,
      total_expenses: Math.round(total * 100) / 100,
      expense_count: techExpenses.length,
      avg_per_expense: techExpenses.length > 0 ? Math.round((total / techExpenses.length) * 100) / 100 : 0,
      categories: Object.fromEntries(
        Array.from(categoryTotals.entries()).map(([cat, tot]) => [cat, Math.round(tot * 100) / 100])
      ),
    };
  });
}

async function detectExpenseAnomalies(months: number = 12): Promise<object> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const [expensesRes, usersRes] = await Promise.all([
    supabase.from('expenses').select('*').gte('date', cutoffDate.toISOString()),
    supabase.from('users').select('*'),
  ]);

  const expenses = expensesRes.data ?? [];
  const users = usersRes.data ?? [];
  const userMap = new Map(users.map((u) => [u.id, u.full_name]));

  const anomalies: object[] = [];

  // Detect duplicates - same user, category, and day with similar amounts
  const expensesByUserDate = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const key = `${e.user_id}-${e.date.substring(0, 10)}-${e.category}`;
    if (!expensesByUserDate.has(key)) expensesByUserDate.set(key, []);
    expensesByUserDate.get(key)!.push(e);
  }

  for (const [, group] of expensesByUserDate) {
    if (group.length > 1) {
      for (let i = 1; i < group.length; i++) {
        const diff = Math.abs(Number(group[0].amount) - Number(group[i].amount));
        if (diff < Number(group[0].amount) * 0.1) {
          anomalies.push({
            type: 'duplicate_billing',
            severity: 'high',
            description: `Potential duplicate ${group[0].category} billing: $${group[0].amount} and $${group[i].amount} on same day`,
            technician: userMap.get(group[0].user_id) ?? 'Unknown',
            amounts: [Number(group[0].amount), Number(group[i].amount)],
            date: group[0].date.substring(0, 10),
            category: group[0].category,
          });
        }
      }
    }
  }

  // Find statistical outliers (>2 std dev from category mean)
  const categoryAmounts = new Map<string, number[]>();
  for (const e of expenses) {
    if (!categoryAmounts.has(e.category)) categoryAmounts.set(e.category, []);
    categoryAmounts.get(e.category)!.push(Number(e.amount));
  }

  for (const [category, amounts] of categoryAmounts) {
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length);
    const threshold = mean + 2 * stdDev;

    for (const e of expenses) {
      if (e.category === category && Number(e.amount) > threshold) {
        anomalies.push({
          type: 'outlier',
          severity: Number(e.amount) > mean + 3 * stdDev ? 'high' : 'medium',
          description: `${category} expense of $${Number(e.amount).toFixed(2)} is ${((Number(e.amount) - mean) / stdDev).toFixed(1)}x standard deviations above the mean ($${mean.toFixed(2)})`,
          technician: userMap.get(e.user_id) ?? 'Unknown',
          amount: Number(e.amount),
          mean: Math.round(mean * 100) / 100,
          threshold: Math.round(threshold * 100) / 100,
          date: e.date.substring(0, 10),
          category,
        });
      }
    }
  }

  // Check for non-standard expense categories
  const standardCategories = new Set(['Flight', 'Hotel', 'Meals', 'Equipment']);
  for (const e of expenses) {
    if (!standardCategories.has(e.category)) {
      anomalies.push({
        type: 'policy_violation',
        severity: Number(e.amount) > 5000 ? 'high' : 'medium',
        description: `Non-standard expense category: "${e.category}" for $${Number(e.amount).toFixed(2)}`,
        technician: userMap.get(e.user_id) ?? 'Unknown',
        amount: Number(e.amount),
        date: e.date.substring(0, 10),
        category: e.category,
      });
    }
  }

  return {
    audit_period: `Last ${months} months`,
    total_expenses_audited: expenses.length,
    anomalies_found: anomalies.length,
    anomalies: anomalies.sort((a: any, b: any) => {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    }),
  };
}

async function getRevenueByPeriod(orgName?: string, months: number = 24): Promise<object> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const [orgsRes, projectsRes, revenueRes] = await Promise.all([
    supabase.from('organizations').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('revenue').select('*').gte('date', cutoffDate.toISOString()),
  ]);

  const orgs = orgsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  let revenue = revenueRes.data ?? [];

  if (orgName) {
    const matchingOrg = orgs.find((o) => o.name.toLowerCase().includes(orgName.toLowerCase()));
    if (matchingOrg) {
      const orgProjectIds = new Set(projects.filter((p) => p.org_id === matchingOrg.id).map((p) => p.id));
      revenue = revenue.filter((r) => orgProjectIds.has(r.project_id));
    }
  }

  const monthlyMap = new Map<string, { total: number; count: number }>();
  for (const r of revenue) {
    const key = r.date.substring(0, 7);
    const entry = monthlyMap.get(key) ?? { total: 0, count: 0 };
    entry.total += Number(r.amount);
    entry.count += 1;
    monthlyMap.set(key, entry);
  }

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      total_revenue: Math.round(data.total * 100) / 100,
      survey_count: data.count,
      avg_per_survey: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
    }));
}

async function getTravelCostPerSurvey(months: number = 24): Promise<object> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const travelCategories = ['Flight', 'Hotel', 'Meals'];

  const [revenueRes, expensesRes] = await Promise.all([
    supabase.from('revenue').select('*').gte('date', cutoffDate.toISOString()),
    supabase.from('expenses').select('*').gte('date', cutoffDate.toISOString()).in('category', travelCategories),
  ]);

  const revenue = revenueRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const monthlyData = new Map<string, { travel_cost: number; survey_count: number }>();

  for (const r of revenue) {
    const key = r.date.substring(0, 7);
    const entry = monthlyData.get(key) ?? { travel_cost: 0, survey_count: 0 };
    entry.survey_count += 1;
    monthlyData.set(key, entry);
  }

  for (const e of expenses) {
    const key = e.date.substring(0, 7);
    const entry = monthlyData.get(key) ?? { travel_cost: 0, survey_count: 0 };
    entry.travel_cost += Number(e.amount);
    monthlyData.set(key, entry);
  }

  return Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      total_travel_cost: Math.round(data.travel_cost * 100) / 100,
      survey_count: data.survey_count,
      avg_travel_cost_per_survey:
        data.survey_count > 0 ? Math.round((data.travel_cost / data.survey_count) * 100) / 100 : 0,
    }));
}

// Router to execute the right tool based on Gemini's function call

async function executeTool(name: string, args: Record<string, unknown>): Promise<object> {
  switch (name) {
    case 'get_financial_overview':
      return getFinancialOverview();
    case 'get_project_margins':
      return getProjectMargins(args.org_name as string | undefined);
    case 'get_expense_trends':
      return getExpenseTrends(args.months as number | undefined, args.category as string | undefined);
    case 'get_technician_expenses':
      return getTechnicianExpenses(args.technician_name as string | undefined);
    case 'detect_expense_anomalies':
      return detectExpenseAnomalies(args.months as number | undefined);
    case 'get_revenue_by_period':
      return getRevenueByPeriod(args.org_name as string | undefined, args.months as number | undefined);
    case 'get_travel_cost_per_survey':
      return getTravelCostPerSurvey(args.months as number | undefined);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Main API handler - orchestrates Gemini function calling loop

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ functionDeclarations: toolDeclarations }],
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: `You are the AI CFO for Robotic Imaging, a company that sends technicians to retail locations (called Projects) to perform site surveys using lidar and imaging equipment.

Your role is to be a sharp, data-driven financial analyst. You have access to tools that query the company's financial database in real-time. Always use these tools to get current data — never guess or make up numbers.

Key business context:
- Revenue comes from survey fees charged per project/store location
- Expenses include technician travel (flights, hotels, meals) and equipment costs
- Organizations are enterprise clients (e.g., 7-Eleven, Home Depot)
- Projects are specific store locations under each organization
- Net Project Margin = Total Revenue - Total Expenses for a project

When answering questions:
1. Always query the database using the available tools — do not assume or fabricate data
2. Present financial figures clearly with dollar signs and percentages
3. When doing forecasting, explain your methodology (e.g., linear trend, moving average)
4. When detecting anomalies, be specific about what the issue is and its severity
5. Provide actionable insights, not just raw numbers
6. Format your response with clear sections using markdown when appropriate`,
          },
        ],
      },
    });

    // Build conversation history for context
    const historyParts = conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: historyParts });

    // Send the user's message
    let result = await chat.sendMessage(message);
    const toolsUsed: string[] = [];

    // Keep calling functions until we get a text response (max 10 iterations for safety)
    let iterations = 0;
    while (iterations < 10) {
      iterations++;
      const candidate = result.response.candidates?.[0];
      if (!candidate) break;

      const functionCalls = candidate.content.parts.filter((p) => p.functionCall);

      if (functionCalls.length === 0) break; // Model gave a text response, we're done

      // Execute all function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (part) => {
          const call = part.functionCall!;
          toolsUsed.push(call.name);
          console.log(`[AI CFO] Calling tool: ${call.name}`, call.args);

          const toolResult = await executeTool(call.name, (call.args as Record<string, unknown>) ?? {});

          return {
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          };
        })
      );

      // Send function results back to the model
      result = await chat.sendMessage(functionResponses);
    }

    const responseText =
      result.response.candidates?.[0]?.content.parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('\n') ?? 'I was unable to process your request. Please try again.';

    return res.status(200).json({
      response: responseText,
      toolsUsed: [...new Set(toolsUsed)],
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Failed to process your request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
