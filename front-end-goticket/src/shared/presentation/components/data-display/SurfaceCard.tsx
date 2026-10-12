import React from 'react';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'soft' | 'elevated' | 'interactive' | 'flat';
  children: React.ReactNode;
  className?: string;
}

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ variant = 'default', children, className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-2xs',
      soft: 'bg-[#F7F5F2] rounded-2xl sm:rounded-3xl border border-gray-200/50',
      elevated: 'bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-[0_12px_32px_rgba(15,23,42,0.06)]',
      interactive: 'bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-2xs hover:border-[#FF385C]/40 hover:shadow-md transition-all cursor-pointer group',
      flat: 'bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80',
    }[variant];

    return (
      <div
        ref={ref}
        className={`p-5 sm:p-6 ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SurfaceCard.displayName = 'SurfaceCard';
