export const REFUND_REASONS = [
  { code: 'CHANGE_OF_PLANS', label: 'Thay đổi kế hoạch chuyến đi' },
  { code: 'WRONG_BOOKING', label: 'Đặt nhầm chuyến, ngày hoặc ghế' },
  { code: 'PERSONAL_REASON', label: 'Lý do cá nhân, không thể đi' },
  { code: 'OTHER', label: 'Khác — tự nhập lý do' },
] as const;
export type CancellationReason = { code: string; text?: string };
export const refundReasonLabel = (code?: string) => code === 'OPERATOR_CANCELLED_TRIP' ? 'Nhà xe hủy chuyến' : REFUND_REASONS.find(r => r.code === code)?.label || code || 'Yêu cầu cũ chưa lưu lý do';
