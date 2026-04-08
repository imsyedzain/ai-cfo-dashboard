import { Building2, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { OrgFinancials, ProjectFinancials } from '../types';

interface OrgHierarchyProps {
  orgs: OrgFinancials[];
  projects: ProjectFinancials[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
    completed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
    on_hold:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] ?? colors.active}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function MarginBar({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const color = percentage >= 40 ? 'bg-emerald-500' : percentage >= 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-24 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function OrgHierarchy({ orgs, projects }: OrgHierarchyProps) {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set(orgs.map((o) => o.org_id)));

  const toggleOrg = (orgId: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  return (
    <div className="bg-white border border-gray-200 dark:bg-slate-800/60 dark:border-slate-700/50 backdrop-blur-sm rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Building2 size={18} className="text-blue-500 dark:text-blue-400" />
        Organization Hierarchy
      </h3>

      <div className="space-y-3">
        {orgs.map((org) => {
          const orgProjects = projects.filter((p) => p.org_name === org.org_name);
          const isExpanded = expandedOrgs.has(org.org_id);

          return (
            <div key={org.org_id} className="border border-gray-200 dark:border-slate-700/50 rounded-lg overflow-hidden">
              {/* Org Header */}
              <button
                onClick={() => toggleOrg(org.org_id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded
                    ? <ChevronDown size={16} className="text-gray-400 dark:text-slate-400" />
                    : <ChevronRight size={16} className="text-gray-400 dark:text-slate-400" />
                  }
                  <Building2 size={16} className="text-blue-500 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{org.org_name}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-400">({org.project_count} projects)</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 dark:text-slate-400">
                    Revenue: <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(org.total_revenue)}</span>
                  </span>
                  <span className={org.profit_margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {org.profit_margin.toFixed(1)}% margin
                  </span>
                </div>
              </button>

              {/* Projects */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 dark:divide-slate-700/30">
                  {orgProjects.map((proj) => (
                    <div
                      key={proj.project_id}
                      className="flex items-center justify-between p-3 pl-10 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin size={14} className="text-gray-400 dark:text-slate-500" />
                        <span className="text-sm text-gray-700 dark:text-slate-200">{proj.project_name}</span>
                        <StatusBadge status={proj.status} />
                      </div>
                      <div className="flex items-center gap-5 text-sm">
                        <span className="text-gray-500 dark:text-slate-400 w-28 text-right">
                          {formatCurrency(proj.total_revenue)}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 w-28 text-right">
                          {formatCurrency(proj.total_expenses)}
                        </span>
                        <div className="flex items-center gap-2 w-36">
                          <MarginBar percentage={proj.margin_percentage} />
                          <span className={`text-xs w-12 text-right ${proj.margin_percentage >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {proj.margin_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
