import React from 'react';

interface DateTimeTextProps {
  value: string | Date | null | undefined;
  format?: 'date' | 'time' | 'datetime' | 'relative';
  className?: string;
}

export const DateTimeText: React.FC<DateTimeTextProps> = ({
  value,
  format = 'datetime',
  className = '',
}) => {
  if (!value) return <span className="text-gray-400">-</span>;

  const dateObj = typeof value === 'string' ? new Date(value) : value;

  if (isNaN(dateObj.getTime())) {
    return <span className={className}>{String(value)}</span>;
  }

  let formatted = '';
  if (format === 'time') {
    formatted = dateObj.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (format === 'date') {
    formatted = dateObj.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } else {
    formatted = `${dateObj.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })} · ${dateObj.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`;
  }

  return (
    <span className={`tabular-nums font-sans ${className}`}>
      {formatted}
    </span>
  );
};
