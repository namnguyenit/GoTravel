import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface InlineAlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: React.ReactNode;
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  type,
  variant,
  title,
  message,
  onRetry,
  onClose,
  className = '',
}) => {
  const alertType = variant || type || 'info';

  const config = {
    info: {
      bg: 'bg-blue-50/80 border-blue-200/80 text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-50/80 border-amber-200/80 text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-rose-50/80 border-rose-200/80 text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
    },
  }[alertType];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border text-sm ${config.bg} ${className}`}
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-xs uppercase tracking-wider mb-0.5">{title}</h4>}
        <div className="text-xs sm:text-sm font-medium leading-relaxed opacity-90">{message}</div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs font-bold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            Thử lại thao tác
          </button>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="text-gray-400 hover:text-gray-700 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
