import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    periodText?: string;
  };
  icon?: LucideIcon;
  badgeText?: string;
  badgeVariant?: 'orange' | 'navy' | 'emerald' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  badgeText,
  badgeVariant = 'slate',
  onClick,
}) => {
  const getBadgeClass = () => {
    switch (badgeVariant) {
      case 'orange':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'navy':
        return 'text-blue-800 bg-blue-50 border-blue-200';
      case 'emerald':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 bg-white border border-slate-200 rounded-lg transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        {badgeText && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getBadgeClass()}`}>
            {badgeText}
          </span>
        )}
        {Icon && !badgeText && (
          <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
          {value}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {trend?.periodText && <span>{trend.periodText}</span>}
          {subtitle && !trend && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
