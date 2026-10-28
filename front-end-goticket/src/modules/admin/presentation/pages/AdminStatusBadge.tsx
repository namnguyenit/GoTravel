import React from 'react';
import { StatusBadge } from '@/shared/presentation/components';
const labels: Record<string, string> = {
  CASH_PENDING: 'Chờ thu tiền mặt',
  PAID_REVIEW: 'Đã thu tiền · Cần rà soát',
  FULFILLMENT_PENDING: 'Đang phát vé',
  CANCELLATION_PENDING: 'Đang hủy vé',
  CASH_RECEIVED_PENDING_RECONCILIATION: 'Đã thu tiền mặt · Đang đồng bộ',
  ABORT_REFUND_PENDING: 'Bỏ đổi vé · Chờ hoàn khoản bù',
  IN_REVIEW: 'Đang xem xét',
  RESOLVED: 'Đã giải quyết',
  REQUESTED: 'Nhà xe yêu cầu chi trả',
  PAID: 'Đã ghi nhận chi trả',
  PREPARED: 'Đã chuẩn bị',
  HELD: 'Đã giữ ghế',
  WAITING_FUNDS: 'Chờ khoản bù',
  ABORTING: 'Đang bỏ nghiệp vụ',
  COMMITTING: 'Đang chốt nghiệp vụ',
  BANNED: 'Đã khóa',
  DELETED: 'Đã xóa',
};
export const AdminStatusBadge = (
  props: React.ComponentProps<typeof StatusBadge>,
) => <StatusBadge {...props} label={props.label || labels[props.status]} />;
