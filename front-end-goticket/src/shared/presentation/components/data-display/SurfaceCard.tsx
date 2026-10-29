import React from 'react';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'soft' | 'elevated' | 'interactive' | 'flat' | 'glass' | 'glass-elevated' | 'glass-interactive' | 'glass-capsule';
  children: React.ReactNode;
  className?: string;
}

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ variant = 'default', children, className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/80 shadow-2xs',
      soft: 'bg-[#F7F5F2]/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-gray-200/50',
      elevated: 'bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl border border-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.06)]',
      interactive: 'bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/80 shadow-2xs hover:border-[var(--gt-brand)]/40 hover:bg-white/95 hover:shadow-md transition-all cursor-pointer group',
      flat: 'bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80',
      glass: 'bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/75 shadow-sm',
      'glass-elevated': 'bg-white/88 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/85 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.10)]',
      'glass-interactive': 'bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/75 shadow-sm hover:border-[var(--gt-brand)]/40 hover:bg-white/92 hover:shadow-lg transition-all cursor-pointer group',
      'glass-capsule': 'bg-white/90 backdrop-blur-xl rounded-full border border-white/85 shadow-md',
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
