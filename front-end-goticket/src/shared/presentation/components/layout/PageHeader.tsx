import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  variant?: 'customer' | 'portal';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  variant = 'customer',
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 ${className}`}>
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-[#9CA3AF]" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-[#111827] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#111827] font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {eyebrow && (
          <div className="text-xs font-bold uppercase tracking-wider text-[#FF385C]">
            {eyebrow}
          </div>
        )}

        <h1
          className={`text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] ${
            variant === 'customer' ? 'font-editorial' : 'font-sans'
          }`}
        >
          {title}
        </h1>

        {description && (
          <p className="text-sm text-[#4B5563] max-w-2xl mt-0.5">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 pt-2 sm:pt-0 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
