/**
 * Local Dev Server — mirrors the Vercel API routes
 * Runs on port 3001; Vite proxies /api/* here
 *
 * Usage: node dev-server.mjs
 * Requires Node 18+ (built-in fetch)
 */

import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Load .env file ────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    process.env[key.trim()] = valueParts.join('=').trim();
  }
  console.log('✅ .env loaded');
} catch {
  console.warn('⚠️  No .env file found — using existing environment variables');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// ── Supabase REST helper ──────────────────────────────────────────────────
const SB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Financial calculation helpers ─────────────────────────────────────────
function calcDashboard(orgs, projects, revenue, expenses) {
  const totalRevenue  = revenue.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit     = totalRevenue - totalExpenses;

  // Per-project
  const projectFinancials = projects.map(p => {
    const pRev = revenue.filter(r => r.project_id === p.id).reduce((s, r) => s + Number(r.amount), 0);
    const pExp = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
    const org  = orgs.find(o => o.id === p.org_id);
    return {
      project_id: p.id, project_name: p.name, org_name: org?.name ?? 'Unknown',
      budget: Number(p.budget), status: p.status,
      total_revenue: round2(pRev), total_expenses: round2(pExp),
      net_margin: round2(pRev - pExp),
      margin_percentage: pRev > 0 ? round2((pRev - pExp) / pRev * 100) : 0,
      budget_utilization: Number(p.budget) > 0 ? round2(pExp / Number(p.budget) * 100) : 0,
    };
  });

  // Per-org
  const orgFinancials = orgs.map(o => {
    const ids   = new Set(projects.filter(p => p.org_id === o.id).map(p => p.id));
    const oRev  = revenue.filter(r => ids.has(r.project_id)).reduce((s, r) => s + Number(r.amount), 0);
    const oExp  = expenses.filter(e => ids.has(e.project_id)).reduce((s, e) => s + Number(e.amount), 0);
    return {
      org_id: o.id, org_name: o.name,
      project_count: projects.filter(p => p.org_id === o.id).length,
      total_revenue: round2(oRev), total_expenses: round2(oExp),
      net_profit: round2(oRev - oExp),
      profit_margin: oRev > 0 ? round2((oRev - oExp) / oRev * 100) : 0,
    };
  });

  // Monthly trends
  const monthlyMap = new Map();
  for (const r of revenue) {
    const k = r.date.substring(0, 7);
    const e = monthlyMap.get(k) ?? { revenue: 0, expenses: 0 };
    e.revenue += Number(r.amount);
    monthlyMap.set(k, e);
  }
  for (const e of expenses) {
    const k = e.date.substring(0, 7);
    const entry = monthlyMap.get(k) ?? { revenue: 0, expenses: 0 };
    entry.expenses += Number(e.amount);
    monthlyMap.set(k, entry);
  }
  const monthly_trends = [...monthlyMap.entries()].sort(([a],[b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, revenue: round2(d.revenue), expenses: round2(d.expenses), profit: round2(d.revenue - d.expenses) }));

  // Expense breakdown
  const catMap = new Map();
  for (const e of expenses) catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));
  const expense_breakdown = [...catMap.entries()]
    .map(([category, total]) => ({ category, total: round2(total), percentage: round2(total / totalExpenses * 100) }))
    .sort((a, b) => b.total - a.total);

  // Senior KPIs
  const last6 = monthly_trends.slice(-6);
  const monthly_burn_rate = last6.length > 0 ? round2(last6.reduce((s,m) => s+m.expenses,0) / last6.length) : 0;
  const avg_revenue_per_survey = revenue.length > 0 ? round2(totalRevenue / revenue.length) : 0;
  const lastTwo = monthly_trends.slice(-2);
  const mom_revenue_growth_pct = lastTwo.length===2 && lastTwo[0].revenue>0 ? round2((lastTwo[1].revenue-lastTwo[0].revenue)/lastTwo[0].revenue*100) : 0;
  const standardCats = new Set(['Flight','Hotel','Meals','Equipment']);
  const anomaly_count = expenses.filter(e => !standardCats.has(e.category)).length;
  const budget_alerts = projectFinancials
    .filter(p => p.budget_utilization >= 80)
    .map(p => ({ project_name: p.project_name, org_name: p.org_name, budget: p.budget, total_expenses: p.total_expenses, utilization_pct: p.budget_utilization, severity: p.budget_utilization >= 100 ? 'critical' : 'warning' }))
    .sort((a,b) => b.utilization_pct - a.utilization_pct);

  return {
    total_revenue: round2(totalRevenue), total_expenses: round2(totalExpenses),
    net_profit: round2(netProfit),
    profit_margin: totalRevenue > 0 ? round2(netProfit / totalRevenue * 100) : 0,
    active_projects: projects.filter(p => p.status === 'active').length,
    monthly_burn_rate, avg_revenue_per_survey, mom_revenue_growth_pct, anomaly_count, budget_alerts,
    total_organizations: orgs.length,
    avg_project_margin: round2(projectFinancials.reduce((s, p) => s + p.margin_percentage, 0) / (projectFinancials.length || 1)),
    monthly_trends, expense_breakdown, org_financials: orgFinancials, project_financials: projectFinancials,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

// ── Gemini tool implementations ───────────────────────────────────────────
async function runTool(name, args) {
  const allOrgs      = () => sbGet('organizations');
  const allProjects  = () => sbGet('projects');
  const allRevenue   = () => sbGet('revenue');
  const allExpenses  = () => sbGet('expenses');
  const allUsers     = () => sbGet('users');

  switch (name) {
    case 'get_financial_overview': {
      const [orgs, projects, revenue, expenses] = await Promise.all([allOrgs(), allProjects(), allRevenue(), allExpenses()]);
      const d = calcDashboard(orgs, projects, revenue, expenses);
      return { total_revenue: d.total_revenue, total_expenses: d.total_expenses, net_profit: d.net_profit, profit_margin_pct: d.profit_margin, active_projects: d.active_projects, organizations: d.org_financials.map(o => ({ org_name: o.org_name, revenue: o.total_revenue, expenses: o.total_expenses, net_profit: o.net_profit, margin_pct: o.profit_margin, project_count: o.project_count })) };
    }
    case 'get_project_margins': {
      const [orgs, projects, revenue, expenses] = await Promise.all([allOrgs(), allProjects(), allRevenue(), allExpenses()]);
      let projs = projects;
      if (args.org_name) {
        const org = orgs.find(o => o.name.toLowerCase().includes(args.org_name.toLowerCase()));
        if (org) projs = projects.filter(p => p.org_id === org.id);
      }
      return projs.map(p => {
        const org  = orgs.find(o => o.id === p.org_id);
        const pRev = revenue.filter(r => r.project_id === p.id).reduce((s,r) => s+Number(r.amount),0);
        const pExp = expenses.filter(e => e.project_id === p.id).reduce((s,e) => s+Number(e.amount),0);
        return { project: p.name, organization: org?.name, budget: Number(p.budget), status: p.status, revenue: round2(pRev), expenses: round2(pExp), net_margin: round2(pRev-pExp), margin_pct: pRev>0?round2((pRev-pExp)/pRev*100):0, budget_utilization_pct: Number(p.budget)>0?round2(pExp/Number(p.budget)*100):0 };
      });
    }
    case 'get_expense_trends': {
      const months = args.months ?? 24;
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
      let expenses = await allExpenses();
      expenses = expenses.filter(e => new Date(e.date) >= cutoff);
      if (args.category) expenses = expenses.filter(e => e.category === args.category);
      const map = new Map();
      for (const e of expenses) {
        const k = e.date.substring(0,7);
        if (!map.has(k)) map.set(k, new Map());
        map.get(k).set(e.category, (map.get(k).get(e.category)??0)+Number(e.amount));
      }
      return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([month,cats]) => ({ month, categories: Object.fromEntries([...cats.entries()].map(([c,t])=>[c,round2(t)])), total: round2([...cats.values()].reduce((s,v)=>s+v,0)) }));
    }
    case 'get_technician_expenses': {
      const [users, expenses] = await Promise.all([allUsers(), allExpenses()]);
      let techs = users.filter(u => u.role === 'technician');
      if (args.technician_name) techs = techs.filter(t => t.full_name.toLowerCase().includes(args.technician_name.toLowerCase()));
      return techs.map(t => {
        const te = expenses.filter(e => e.user_id === t.id);
        const catMap = new Map();
        for (const e of te) catMap.set(e.category, (catMap.get(e.category)??0)+Number(e.amount));
        const total = te.reduce((s,e)=>s+Number(e.amount),0);
        return { technician: t.full_name, email: t.email, total_expenses: round2(total), expense_count: te.length, avg_per_expense: te.length>0?round2(total/te.length):0, categories: Object.fromEntries([...catMap.entries()].map(([c,t])=>[c,round2(t)])) };
      });
    }
    case 'detect_expense_anomalies': {
      const months = args.months ?? 12;
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
      const [users, allExp] = await Promise.all([allUsers(), allExpenses()]);
      const expenses = allExp.filter(e => new Date(e.date) >= cutoff);
      const userMap = new Map(users.map(u => [u.id, u.full_name]));
      const anomalies = [];
      // Duplicates
      const byKey = new Map();
      for (const e of expenses) {
        const k = `${e.user_id}-${e.date.substring(0,10)}-${e.category}`;
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k).push(e);
      }
      for (const [,grp] of byKey) {
        if (grp.length > 1) {
          for (let i = 1; i < grp.length; i++) {
            if (Math.abs(Number(grp[0].amount)-Number(grp[i].amount)) < Number(grp[0].amount)*0.1) {
              anomalies.push({ type:'duplicate_billing', severity:'high', description:`Potential duplicate ${grp[0].category} billing: $${grp[0].amount} and $${grp[i].amount} on same day`, technician: userMap.get(grp[0].user_id)??'Unknown', amounts:[Number(grp[0].amount),Number(grp[i].amount)], date:grp[0].date.substring(0,10), category:grp[0].category });
            }
          }
        }
      }
      // Outliers
      const catAmts = new Map();
      for (const e of expenses) { if (!catAmts.has(e.category)) catAmts.set(e.category,[]); catAmts.get(e.category).push(Number(e.amount)); }
      for (const [cat, amts] of catAmts) {
        const mean = amts.reduce((s,a)=>s+a,0)/amts.length;
        const std  = Math.sqrt(amts.reduce((s,a)=>s+(a-mean)**2,0)/amts.length);
        const thresh = mean + 2*std;
        for (const e of expenses) {
          if (e.category===cat && Number(e.amount)>thresh) {
            anomalies.push({ type:'outlier', severity:Number(e.amount)>mean+3*std?'high':'medium', description:`${cat} of $${Number(e.amount).toFixed(2)} is ${((Number(e.amount)-mean)/std).toFixed(1)}σ above mean ($${mean.toFixed(2)})`, technician:userMap.get(e.user_id)??'Unknown', amount:Number(e.amount), mean:round2(mean), threshold:round2(thresh), date:e.date.substring(0,10), category:cat });
          }
        }
      }
      // Policy violations
      const standard = new Set(['Flight','Hotel','Meals','Equipment']);
      for (const e of expenses) {
        if (!standard.has(e.category)) anomalies.push({ type:'policy_violation', severity:Number(e.amount)>5000?'high':'medium', description:`Non-standard category: "${e.category}" for $${Number(e.amount).toFixed(2)}`, technician:userMap.get(e.user_id)??'Unknown', amount:Number(e.amount), date:e.date.substring(0,10), category:e.category });
      }
      return { audit_period:`Last ${months} months`, total_expenses_audited:expenses.length, anomalies_found:anomalies.length, anomalies:anomalies.sort((a,b)=>({high:0,medium:1,low:2}[a.severity]??2)-({high:0,medium:1,low:2}[b.severity]??2)) };
    }
    case 'get_travel_cost_per_survey': {
      const months = args.months ?? 24;
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
      const [revenue, expenses] = await Promise.all([allRevenue(), allExpenses()]);
      const travelCats = new Set(['Flight','Hotel','Meals']);
      const map = new Map();
      for (const r of revenue.filter(r=>new Date(r.date)>=cutoff)) {
        const k = r.date.substring(0,7);
        const e = map.get(k)??{travel:0,surveys:0}; e.surveys++; map.set(k,e);
      }
      for (const e of expenses.filter(e=>new Date(e.date)>=cutoff&&travelCats.has(e.category))) {
        const k = e.date.substring(0,7);
        const entry = map.get(k)??{travel:0,surveys:0}; entry.travel+=Number(e.amount); map.set(k,entry);
      }
      return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([month,d]) => ({ month, total_travel_cost:round2(d.travel), survey_count:d.surveys, avg_travel_cost_per_survey:d.surveys>0?round2(d.travel/d.surveys):0 }));
    }
    case 'get_revenue_by_period': {
      const months = args.months ?? 24;
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
      const [orgs, projects, revenue] = await Promise.all([allOrgs(), allProjects(), allRevenue()]);
      let rev = revenue.filter(r => new Date(r.date) >= cutoff);
      if (args.org_name) {
        const org = orgs.find(o => o.name.toLowerCase().includes(args.org_name.toLowerCase()));
        if (org) { const ids = new Set(projects.filter(p=>p.org_id===org.id).map(p=>p.id)); rev = rev.filter(r=>ids.has(r.project_id)); }
      }
      const map = new Map();
      for (const r of rev) { const k=r.date.substring(0,7); const e=map.get(k)??{total:0,count:0}; e.total+=Number(r.amount); e.count++; map.set(k,e); }
      return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([month,d]) => ({ month, total_revenue:round2(d.total), survey_count:d.count, avg_per_survey:d.count>0?round2(d.total/d.count):0 }));
    }
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ── Gemini chat handler ───────────────────────────────────────────────────
async function handleChat(body) {
  const { message, conversationHistory = [] } = body;

  const tools = [
    { name:'get_financial_overview',    description:'High-level financial overview — total revenue, expenses, net profit, per-org breakdown.', parameters:{type:'object',properties:{}} },
    { name:'get_project_margins',       description:'Revenue, expenses, and net margin per project. Filter by org_name optionally.', parameters:{type:'object',properties:{org_name:{type:'string',description:'Filter by org name e.g. "Home Depot Field Ops"'}}} },
    { name:'get_expense_trends',        description:'Monthly expense trends by category (Flight/Hotel/Meals/Equipment). Good for forecasting.', parameters:{type:'object',properties:{months:{type:'number'},category:{type:'string'}}} },
    { name:'get_technician_expenses',   description:'Per-technician spending breakdown.', parameters:{type:'object',properties:{technician_name:{type:'string'}}} },
    { name:'detect_expense_anomalies',  description:'Audit expenses — finds duplicates, outliers, policy violations.', parameters:{type:'object',properties:{months:{type:'number',description:'Months to audit (default 12)'}}} },
    { name:'get_travel_cost_per_survey',description:'Average travel cost (flights+hotels+meals) per survey by month. Use for run-rate forecasting.', parameters:{type:'object',properties:{months:{type:'number'}}} },
    { name:'get_revenue_by_period',     description:'Monthly revenue grouped by period.', parameters:{type:'object',properties:{org_name:{type:'string'},months:{type:'number'}}} },
  ];

  const systemPrompt = `You are the AI CFO for Robotic Imaging, a company that sends technicians to retail locations (Projects) to perform lidar site surveys. Revenue = survey fees. Expenses = technician travel (flights, hotels, meals) + equipment. Organizations are enterprise clients (7-Eleven, Home Depot). Always use the provided tools to query real data — never guess. Present dollar amounts clearly. When forecasting, explain your methodology. Be analytical and actionable.`;

  const messages = [
    ...conversationHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts:[{text:m.content}] })),
    { role:'user', parts:[{text:message}] }
  ];

  const payload = {
    system_instruction: { parts:[{text:systemPrompt}] },
    tools: [{ function_declarations: tools.map(t => ({ name:t.name, description:t.description, parameters:t.parameters })) }],
    contents: messages,
    generation_config: { temperature: 0.2 },
  };

  const toolsUsed = [];
  let maxIter = 8;

  while (maxIter-- > 0) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }
    );
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidate from Gemini');

    const parts = candidate.content?.parts ?? [];
    payload.contents.push({ role:'model', parts });

    const fnCalls = parts.filter(p => p.functionCall);
    if (fnCalls.length === 0) {
      const text = parts.filter(p=>p.text).map(p=>p.text).join('\n');
      return { response: text, toolsUsed: [...new Set(toolsUsed)] };
    }

    // Execute all tool calls and feed results back
    const fnResponses = await Promise.all(fnCalls.map(async p => {
      const { name, args } = p.functionCall;
      toolsUsed.push(name);
      console.log(`  [AI CFO] → ${name}`, args ?? '');
      const result = await runTool(name, args ?? {});
      return { functionResponse:{ name, response:result } };
    }));

    payload.contents.push({ role:'user', parts: fnResponses });
  }

  return { response:'I was unable to complete the analysis. Please try again.', toolsUsed };
}

// ── HTTP Server ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:3001`);
  console.log(`${req.method} ${url.pathname}`);

  try {
    if (url.pathname === '/api/dashboard' && req.method === 'GET') {
      const [orgs, projects, revenue, expenses] = await Promise.all([
        sbGet('organizations'), sbGet('projects'), sbGet('revenue'), sbGet('expenses'),
      ]);
      const result = calcDashboard(orgs, projects, revenue, expenses);
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify(result));

    } else if (url.pathname === '/api/chat' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const result = await handleChat(JSON.parse(body));
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify(result));

    } else {
      res.writeHead(404, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error:'Not found' }));
    }
  } catch (err) {
    console.error('  ERROR:', err.message);
    res.writeHead(500, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(3001, () => {
  console.log('\n🚀 Dev API server running on http://localhost:3001');
  console.log('   /api/dashboard  →  GET');
  console.log('   /api/chat       →  POST');
  console.log('\nReady — start Vite in another terminal with: npm run dev\n');
});
