import { type ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function KPICard({ title, value, subtitle, icon, trend, trendValue }: KPICardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-500 dark:text-slate-400';

  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm dark:bg-slate-800/60 dark:border-slate-700/50 dark:hover:border-slate-600/50 dark:hover:shadow-none backdrop-blur-sm transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">{title}</span>
        <div className="text-blue-500 dark:text-blue-400 opacity-80">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {trendValue && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendArrow} {trendValue}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-gray-400 dark:text-slate-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
