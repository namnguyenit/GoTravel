import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  variant?: 'card-skeleton' | 'table-skeleton' | 'spinner';
  count?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải dữ liệu...',
  submessage,
  variant = 'card-skeleton',
  count = 3,
  className = '',
}) => {
  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-[#FF385C] mb-3" />
        <p className="text-sm font-semibold text-gray-700">{message}</p>
        {submessage && <p className="text-xs text-gray-400 mt-1">{submessage}</p>}
      </div>
    );
  }

  if (variant === 'table-skeleton') {
    return (
      <div className={`w-full bg-white rounded-2xl border border-gray-200/80 p-4 space-y-4 ${className}`}>
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-6 w-1/4 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-6 w-1/3 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-6 w-1/5 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-6 flex-1 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-gray-200/80 animate-pulse space-y-3 shadow-2xs"
        >
          <div className="flex justify-between items-center">
            <div className="h-5 w-32 bg-gray-200/80 rounded-md" />
            <div className="h-5 w-20 bg-gray-200/80 rounded-md" />
          </div>
          <div className="h-8 w-2/3 bg-gray-100 rounded-lg" />
          <div className="flex justify-between items-center pt-2">
            <div className="h-4 w-24 bg-gray-100 rounded-md" />
            <div className="h-8 w-28 bg-[#FFF0F2] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
