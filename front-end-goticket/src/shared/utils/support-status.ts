/** Customer-facing labels for support and ticket adjustment states. */
export const supportStatusLabels: Record<string, string> = {
  OPEN: 'Mới gửi',
  IN_REVIEW: 'Đang xem xét',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Đã từ chối',
  REFUNDED: 'Đã hoàn tiền',
  REFUND_PENDING: 'Chờ hoàn tiền',
  SUBMITTED: 'Đã tiếp nhận',
  PREPARED: 'Đã tiếp nhận',
  HELD: 'Đã giữ chỗ mới',
  WAITING_FUNDS: 'Chờ tiền chênh lệch',
  COMMITTING: 'Đang chốt thay đổi',
  SETTLING: 'Đang đồng bộ vé',
  COMPLETED: 'Đã hoàn tất',
  ABORTING: 'Đang bỏ yêu cầu',
  ABORTED: 'Đã bỏ yêu cầu',
  ABORT_REFUND_PENDING: 'Chờ hoàn khoản thu thêm',
};
