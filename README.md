# AI CFO Dashboard — Robotic Imaging

Financial analytics dashboard for field operations. Uses Gemini function calling to let an AI query the database directly instead of stuffing all data in the prompt.

---

## Live Demo

> **[https://ai-cfo-dashboard.vercel.app](https://ai-cfo-dashboard.vercel.app)**

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast HMR, strict types, modern toolchain |
| Styling | Tailwind CSS (class dark mode) | Utility-first, dark/light toggle with zero runtime overhead |
| Charts | Recharts | Composable, works well with React state |
| Database | Supabase (PostgreSQL) | Managed Postgres, PostgREST API, built-in RLS |
| AI | Gemini 2.0 Flash | Native function/tool calling, fast inference |
| Deployment | Vercel (serverless functions) | Zero-config, edge-ready API routes |

---

## Architecture

### 1. Relational Data Model

```
organizations
    └── projects  (budget, status, org_id FK)
            ├── revenue   (survey fees per project)
            └── expenses  (per technician: flight/hotel/meals/equipment)
                    └── users (technician, org_id FK)
```

**Key choices:**
- All money columns use `NUMERIC(15,2)` to avoid floating-point issues
- `CHECK` constraint on project status for data integrity
- Indexes on project_id and date for fast aggregations

```sql
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_date       ON expenses(date);
CREATE INDEX idx_expenses_category   ON expenses(category);
CREATE INDEX idx_revenue_project_id  ON revenue(project_id);
CREATE INDEX idx_revenue_date        ON revenue(date);
```

- RLS enabled on all tables (service key server-side, anon key for frontend)

---

### 2. AI Orchestration — Gemini Function/Tool Calling

Instead of dumping all data into the prompt, the AI uses function calling to query Supabase directly. This scales much better and eliminates hallucinations.

#### How it works

```
User question
      │
      ▼
POST /api/chat
      │
      ▼
Gemini receives question + 7 tool declarations
      │
      ├─► Gemini decides which tool(s) to call
      │         e.g. get_project_margins({ org_name: "Home Depot" })
      │
      ├─► Server executes tool → queries Supabase REST API
      │
      ├─► Tool results sent back to Gemini
      │
      └─► Gemini synthesises a natural language response
```

The loop supports **multi-turn tool calling** — Gemini can chain multiple tool calls in a single conversation turn (e.g., call `get_project_margins` then `detect_expense_anomalies` to answer a compound question).

#### The 7 CFO Tools

| Tool | Purpose |
|---|---|
| `get_financial_overview` | Company-wide KPIs: revenue, expenses, profit, per-org breakdown |
| `get_project_margins` | Per-project P&L, filterable by organisation |
| `get_expense_trends` | Monthly expense trends by category — enables forecasting |
| `get_technician_expenses` | Per-technician spending audit with category breakdown |
| `detect_expense_anomalies` | Statistical outlier detection + duplicate billing + policy violations |
| `get_travel_cost_per_survey` | Travel cost efficiency metric — avg cost per site visit |
| `get_revenue_by_period` | Revenue trends with survey counts — enables run-rate projections |

#### Why this beats prompt-stuffing

| Approach | Context tokens used | Scales to 10k rows? | Accurate? |
|---|---|---|---|
| Dump all data in prompt | ~50,000+ | ❌ | ❌ (hallucination risk) |
| Function calling (this app) | ~500 (tool schema only) | ✅ | ✅ (real DB queries) |

---

### 3. API Layer — Vercel Serverless Functions

Two endpoints, both in `/api/`:

**`GET /api/dashboard`**
- Parallel-fetches all four tables via Supabase
- Computes 8 KPIs server-side: total revenue/expenses/profit, margin, burn rate, avg revenue per survey, MoM growth, anomaly count
- Budget overrun alerts (≥80% utilisation)
- 60s cache header (`s-maxage=60`) — reduces DB load on repeat page loads

**`POST /api/chat`**
- Stateless: accepts message + conversation history
- Runs the Gemini tool-calling loop (max 8 iterations, safety guard)
- Returns response text + list of tools used

---

### 4. Frontend Architecture

```
src/
├── types/index.ts          # All domain + computed types (strict, no `any`)
├── lib/
│   ├── supabase.ts         # Supabase client (anon key, frontend-safe)
│   └── api.ts              # Typed fetch wrappers for /api/*
├── hooks/
│   └── useTheme.ts         # Dark/light mode with localStorage persistence
└── components/
    ├── KPICard.tsx          # Reusable metric card
    ├── OrgHierarchy.tsx     # Collapsible org → project tree
    ├── FinancialCharts.tsx  # Line, bar, pie charts (Recharts)
    └── ChatInterface.tsx    # Full chat UI with suggested prompts
```

**State:** Just local React state. Dashboard fetches once on mount, chat history stays in component state.

---

### 5. Product Intuition — KPIs Surfaced

Beyond the obvious Revenue/Expenses/Profit, the dashboard surfaces metrics that actually matter to a field operations CFO:

| KPI | Why it matters |
|---|---|
| **Monthly Burn Rate** | Cash going out the door each month — critical for runway planning |
| **Avg Revenue / Survey** | Unit economics — are we charging enough per visit? |
| **MoM Revenue Growth %** | Trend signal — is the business growing or shrinking? |
| **Expense Anomaly Count** | Instant fraud signal on the main dashboard |
| **Budget Utilisation per Project** | Proactive alerts at 80% and 100% — before it's too late |
| **Org/Project Hierarchy** | Visual drill-down from enterprise client → store location → margin |

---

### 6. Fraud Detection Logic

The `detect_expense_anomalies` tool uses three independent detection methods:

1. **Duplicate billing** — same user, same category, same calendar day, amounts within 10% of each other → flags as `high` severity
2. **Statistical outliers** — for each expense category, computes mean + standard deviation across all expenses; anything >2σ is `medium`, >3σ is `high`
3. **Policy violations** — any expense category not in the standard set `{Flight, Hotel, Meals, Equipment}` is flagged immediately

The seeded data includes two intentional anomalies to demonstrate this:
- **Marcus Thorne**: $7,500 "Unauthorized Hardware Purchase" (8 months ago) — caught by both outlier detection and policy violation rules
- **Aisha Patel**: Duplicate flight billing on the same day (3 months ago) — caught by duplicate billing detection

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Run the schema in Supabase SQL Editor
# (paste contents of supabase/schema.sql)

# 4. Seed the database (Node 18+ required, no npm install needed)
node supabase/seed-standalone.mjs

# 5. Start the local API server (Terminal 1)
node dev-server.mjs

# 6. Start the Vite frontend (Terminal 2)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (safe for frontend) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## Deployment (Vercel)

```bash
# One-time setup
npx vercel

# Set environment variables
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_KEY
npx vercel env add GEMINI_API_KEY

# Deploy to production
npx vercel --prod
```

---

## Demo Questions (AI CFO)

These are the three questions specified in the assessment:

**1. Profitability**
> "What is our overall net profit margin across all Home Depot locations?"

**2. Forecasting**
> "How have our average travel costs per survey changed over the last 24 months? Based on this, what is our projected expense run-rate for the upcoming quarter?"

**3. Fraud Detection**
> "Run an audit on technician expenses over the last year. Are there any duplicate flight billings or unusually large equipment purchases we should investigate?"

---

## Trade-offs & What I'd Add With More Time

- **Real-time subscriptions** — Supabase supports Postgres CDC; the dashboard could live-update as expenses come in
- **Role-based access** — managers see all data; technicians see only their own expenses (Supabase RLS policies per user JWT)
- **Export to PDF** — one-click CFO report generation
- **Email alerts** — trigger when a project hits 90% budget utilisation
- **More organisations** — the schema is designed to scale horizontally; adding a new org/project is just an INSERT
