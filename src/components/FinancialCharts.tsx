import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import type { MonthlyTrend, ExpenseByCategory } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface MonthlyTrendChartProps { data: MonthlyTrend[]; }
interface ExpensePieChartProps   { data: ExpenseByCategory[]; }

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m, 10) - 1]} '${year.slice(2)}`;
}

// Detect dark mode at render time so Recharts inline styles match the theme
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  const dark = isDarkMode();
  return (
    <div style={{
      background: dark ? '#1e293b' : '#ffffff',
      border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`,
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <p style={{ color: dark ? '#94a3b8' : '#64748b', fontSize: '11px', marginBottom: '6px' }}>
        {label ? formatMonth(label) : ''}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: '13px' }}>
          {entry.name}: {formatCurrencyShort(entry.value)}
        </p>
      ))}
    </div>
  );
}

function chartAxisColor(): string {
  return isDarkMode() ? '#64748b' : '#94a3b8';
}

function chartGridColor(): string {
  return isDarkMode() ? '#334155' : '#e2e8f0';
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const axis  = chartAxisColor();
  const grid  = chartGridColor();
  return (
    <div className="bg-white border border-gray-200 dark:bg-slate-800/60 dark:border-slate-700/50 backdrop-blur-sm rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue vs Expenses (24 mo)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="month" tickFormatter={formatMonth} stroke={axis} tick={{ fontSize: 11, fill: axis }} interval={2} />
          <YAxis tickFormatter={formatCurrencyShort} stroke={axis} tick={{ fontSize: 11, fill: axis }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="revenue"  stroke="#10b981" strokeWidth={2} name="Revenue"    dot={false} />
          <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses"   dot={false} />
          <Line type="monotone" dataKey="profit"   stroke="#3b82f6" strokeWidth={2} name="Net Profit" dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProfitBarChart({ data }: MonthlyTrendChartProps) {
  const axis = chartAxisColor();
  const grid = chartGridColor();
  return (
    <div className="bg-white border border-gray-200 dark:bg-slate-800/60 dark:border-slate-700/50 backdrop-blur-sm rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Profit Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="month" tickFormatter={formatMonth} stroke={axis} tick={{ fontSize: 11, fill: axis }} interval={2} />
          <YAxis tickFormatter={formatCurrencyShort} stroke={axis} tick={{ fontSize: 11, fill: axis }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpensePieChart({ data }: ExpensePieChartProps) {
  const dark = isDarkMode();
  return (
    <div className="bg-white border border-gray-200 dark:bg-slate-800/60 dark:border-slate-700/50 backdrop-blur-sm rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expense Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={60} outerRadius={100}
            paddingAngle={3} dataKey="total" nameKey="category"
            label={({ category, percentage }) => `${category} (${percentage}%)`}
          >
            {data.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrencyShort(value)}
            contentStyle={{
              background: dark ? '#1e293b' : '#ffffff',
              border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
