import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  subtext?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'coral' | 'emerald';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  trend,
  variant = 'default',
  className = '',
}) => {
  const iconBg = {
    default: 'bg-gray-100 text-gray-700',
    coral: 'bg-[#FFF0F2] text-[#FF385C]',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[variant];

  return (
    <div className={`bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#111827] tabular-nums tracking-tight">
            {value}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={`font-semibold tabular-nums ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
