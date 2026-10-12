import React from 'react';

export interface MoneyTextProps {
  amount: number | string | null | undefined;
  currency?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  variant?: 'coral' | 'ink' | 'muted' | 'success';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' | string;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  currency = '₫',
  className = '',
  size = 'base',
  variant = 'coral',
  weight,
}) => {
  if (amount === null || amount === undefined || amount === '') {
    return <span className="text-gray-400">0 {currency}</span>;
  }

  const numericVal = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = isNaN(numericVal)
    ? String(amount)
    : numericVal.toLocaleString('vi-VN');

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm font-semibold',
    base: 'text-base font-bold',
    lg: 'text-lg font-extrabold',
    xl: 'text-xl font-black',
    '2xl': 'text-2xl sm:text-3xl font-black',
  }[size];

  const variantClasses = {
    coral: 'text-[#FF385C]',
    ink: 'text-[#111827]',
    muted: 'text-[#4B5563]',
    success: 'text-emerald-600',
  }[variant];

  const weightClass = weight ? `font-${weight}` : '';

  return (
    <span
      className={`tabular-nums font-sans tracking-tight ${sizeClasses} ${variantClasses} ${weightClass} ${className}`}
    >
      {formatted} <span className="text-[0.85em] font-bold">{currency}</span>
    </span>
  );
};
