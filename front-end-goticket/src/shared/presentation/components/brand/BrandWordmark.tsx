import React from 'react';
import { Link } from 'react-router-dom';

export interface BrandWordmarkProps {
  to?: string;
  variant?: 'customer' | 'portal';
  size?: 'sm' | 'base' | 'lg';
  badge?: string;
  className?: string;
}

/** Official Go family artwork: original G/T symbol and outlined Outfit wordmark. */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  to = '/', variant = 'customer', size = 'base', badge, className = '',
}) => {
  const height = { sm: 'h-8', base: 'h-11', lg: 'h-14' }[size];
  const content = <span className="inline-flex min-w-0 shrink-0 items-center gap-2.5 select-none">
    {variant === 'portal' && <img src="/brand/goticket-symbol.svg" alt="" width={32} height={32} className="goticket-brand-image h-8 sm:hidden" />}
    <img src="/brand/goticket-lockup.svg" alt="GoTicket" width={224.31} height={64}
      className={`goticket-brand-image ${height} ${variant === 'portal' ? 'hidden sm:block' : ''}`} />
    {badge && <span className="max-w-24 truncate rounded-full border border-gray-200/80 bg-gray-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-gray-700 uppercase">{badge}</span>}
  </span>;
  return to
    ? <Link to={to} aria-label="GoTicket - Trang chủ" className={`inline-flex min-h-11 shrink-0 items-center rounded-md transition-opacity hover:opacity-85 ${className}`}>{content}</Link>
    : <span className={`inline-flex items-center ${className}`}>{content}</span>;
};
