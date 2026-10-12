import React from 'react';
import { Link } from 'react-router-dom';

export interface BrandWordmarkProps {
  to?: string;
  variant?: 'customer' | 'portal';
  size?: 'sm' | 'base' | 'lg';
  badge?: string;
  className?: string;
}

export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  to = '/',
  variant = 'customer',
  size = 'base',
  badge,
  className = '',
}) => {
  const textSizeClass = {
    sm: 'text-xl',
    base: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="flex items-baseline tracking-tight font-sans">
        <span className={`font-extrabold text-[#111827] leading-none ${textSizeClass}`}>Go</span>
        <span className={`font-bold text-[#111827] leading-none ${textSizeClass}`}>Ticket</span>
        <span className={`font-black text-[#FF385C] leading-none ml-0.5 ${textSizeClass}`}>.</span>
      </div>
      {badge && (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#111827]/5 text-[#374151] border border-gray-200/80 tracking-wide uppercase">
          {badge}
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
};
