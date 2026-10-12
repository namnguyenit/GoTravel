import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center shadow-2xs flex flex-col items-center justify-center max-w-xl mx-auto my-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
        {title}
      </h3>

      <div className="mt-1.5 text-xs sm:text-sm text-[#4B5563] max-w-md leading-relaxed">
        {description}
      </div>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
