import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  error?: string | Error | null;
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
  onAction?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra sự cố',
  error,
  message,
  actionLabel = 'Thử lại kết nối',
  onRetry,
  onAction,
  className = '',
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  const displayMessage =
    message ||
    (typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : 'Hệ thống không thể tải được nội dung vào lúc này. Vui lòng kiểm tra lại kết nối hoặc thử lại.');

  const handleAction = onAction || onRetry;

  return (
    <div
      role="alert"
      className={`bg-white rounded-2xl sm:rounded-3xl border border-rose-200/80 p-8 sm:p-10 text-center shadow-2xs max-w-lg mx-auto my-6 flex flex-col items-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
        {title}
      </h3>

      <p className="mt-1.5 text-xs sm:text-sm text-gray-600 max-w-md leading-relaxed">
        {displayMessage}
      </p>

      {handleAction && (
        <div className="mt-5">
          <Button
            type="button"
            onClick={handleAction}
            className="rounded-full bg-[#111827] hover:bg-[#FF385C] text-white text-xs font-bold px-5 py-2.5 h-auto transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {actionLabel}
          </Button>
        </div>
      )}

      {error && typeof error !== 'string' && (
        <div className="mt-4 w-full text-left">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto transition-colors cursor-pointer"
          >
            {showTechnical ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
            {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showTechnical && (
            <pre className="mt-2 p-3 bg-gray-50 rounded-xl text-[10px] text-gray-700 font-mono overflow-x-auto max-h-40 border border-gray-100">
              {error.stack || error.message}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
