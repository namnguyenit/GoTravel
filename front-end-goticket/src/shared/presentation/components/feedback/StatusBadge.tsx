import React from 'react';

export type GeneralStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SCHEDULED'
  | 'DEPARTED'
  | 'DRAFT'
  | 'PUBLISHING'
  | 'ON_SALE'
  | 'STOP_SALE'
  | 'CHECKED_IN'
  | 'NO_SHOW'
  | 'EXCHANGED'
  | 'AMENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'OPEN'
  | 'CLOSED'
  | string;

interface StatusBadgeProps {
  status: GeneralStatus;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_DICTIONARY: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  // Positive / Confirmed / Success
  CONFIRMED: { label: 'Đã xác nhận', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  COMPLETED: { label: 'Hoàn tất', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  ACTIVE: { label: 'Đang hoạt động', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  ON_SALE: { label: 'Đang mở bán', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  CHECKED_IN: { label: 'Đã lên xe', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  APPROVED: { label: 'Đã duyệt', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  OPEN: { label: 'Đang mở', bg: 'bg-emerald-50/80 backdrop-blur-xs border border-emerald-500/25', text: 'text-emerald-800', dot: 'bg-emerald-500' },

  // Pending / Warning
  PENDING: { label: 'Chờ xử lý', bg: 'bg-amber-50/80 backdrop-blur-xs border border-amber-500/25', text: 'text-amber-800', dot: 'bg-amber-500' },
  PAYMENT_PENDING: { label: 'Chờ thanh toán', bg: 'bg-amber-50/80 backdrop-blur-xs border border-amber-500/25', text: 'text-amber-800', dot: 'bg-amber-500' },
  SCHEDULED: { label: 'Lên lịch', bg: 'bg-blue-50/80 backdrop-blur-xs border border-blue-500/25', text: 'text-blue-800', dot: 'bg-blue-500' },
  PUBLISHING: { label: 'Đang khởi tạo', bg: 'bg-blue-50/80 backdrop-blur-xs border border-blue-500/25', text: 'text-blue-800', dot: 'bg-blue-500' },
  AMENDING: { label: 'Đang sửa đổi', bg: 'bg-amber-50/80 backdrop-blur-xs border border-amber-500/25', text: 'text-amber-800', dot: 'bg-amber-500' },
  EXCHANGING: { label: 'Đang đổi vé', bg: 'bg-amber-50/80 backdrop-blur-xs border border-amber-500/25', text: 'text-amber-800', dot: 'bg-amber-500' },
  REFUND_PENDING: { label: 'Chờ hoàn tiền', bg: 'bg-amber-50/80 backdrop-blur-xs border border-amber-500/25', text: 'text-amber-800', dot: 'bg-amber-500' },
  OPERATION_PENDING: { label: 'Đang tiến hành', bg: 'bg-amber-50/80 backdrop-blur-xs border border-amber-500/25', text: 'text-amber-800', dot: 'bg-amber-500' },

  // Neutral / Info
  DRAFT: { label: 'Bản nháp', bg: 'bg-stone-100/80 backdrop-blur-xs border border-stone-300/50', text: 'text-stone-700', dot: 'bg-stone-400' },
  DEPARTED: { label: 'Đã xuất bến', bg: 'bg-indigo-50/80 backdrop-blur-xs border border-indigo-500/25', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  EXCHANGED: { label: 'Đã đổi vé', bg: 'bg-indigo-50/80 backdrop-blur-xs border border-indigo-500/25', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  CLOSED: { label: 'Đã đóng ca', bg: 'bg-gray-100/80 backdrop-blur-xs border border-gray-300/40', text: 'text-gray-700', dot: 'bg-gray-400' },
  STOP_SALE: { label: 'Tạm ngừng bán', bg: 'bg-gray-100/80 backdrop-blur-xs border border-gray-300/40', text: 'text-gray-700', dot: 'bg-gray-400' },
  INACTIVE: { label: 'Ngừng hoạt động', bg: 'bg-gray-100/80 backdrop-blur-xs border border-gray-300/40', text: 'text-gray-700', dot: 'bg-gray-400' },

  // Negative / Cancelled / Error
  CANCELLED: { label: 'Đã hủy', bg: 'bg-rose-50/80 backdrop-blur-xs border border-rose-500/25', text: 'text-rose-800', dot: 'bg-rose-500' },
  REFUNDED: { label: 'Đã hoàn tiền', bg: 'bg-rose-50/80 backdrop-blur-xs border border-rose-500/25', text: 'text-rose-800', dot: 'bg-rose-500' },
  REJECTED: { label: 'Từ chối', bg: 'bg-rose-50/80 backdrop-blur-xs border border-rose-500/25', text: 'text-rose-800', dot: 'bg-rose-500' },
  NO_SHOW: { label: 'Vắng mặt', bg: 'bg-rose-50/80 backdrop-blur-xs border border-rose-500/25', text: 'text-rose-800', dot: 'bg-rose-500' },
  VOID: { label: 'Vô hiệu', bg: 'bg-rose-50/80 backdrop-blur-xs border border-rose-500/25', text: 'text-rose-800', dot: 'bg-rose-500' },
  ABORTED: { label: 'Đã bỏ dở', bg: 'bg-rose-50/80 backdrop-blur-xs border border-rose-500/25', text: 'text-rose-800', dot: 'bg-rose-500' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const normalizedStatus = String(status).toUpperCase();
  const config = STATUS_DICTIONARY[normalizedStatus] || {
    label: label || status,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  };

  const displayText = label || config.label;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full ${config.bg} ${config.text} ${sizeClasses} select-none ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className="truncate">{displayText}</span>
    </span>
  );
};
