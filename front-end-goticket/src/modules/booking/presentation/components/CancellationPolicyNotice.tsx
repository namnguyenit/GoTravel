import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import type { TransportCancellationPolicy } from '../../domain/entity/order.entity';
import { DateVo } from '@/shared/domain/date.vo';

export function CancellationPolicyNotice({ policy, departureAt, snapshot = false }: {
  policy?: TransportCancellationPolicy; departureAt?: string; snapshot?: boolean;
}) {
  const [current, setCurrent] = useState<TransportCancellationPolicy>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (policy || snapshot) return;
    let active = true;
    void httpClient.get<TransportCancellationPolicy>('/api/v1/orders/transport/cancellation-policy')
      .then(data => { if (active) setCurrent(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [policy, snapshot]);
  const value = policy ?? current;
  if (!value) return <p className="text-sm text-gray-600">{snapshot ? 'Đơn chưa có chính sách hoàn tiền được chốt. Liên hệ hỗ trợ trước khi đổi/hủy.' : failed ? 'Chưa tải được chính sách đổi/hủy. Vui lòng tải lại trang trước khi thanh toán.' : 'Đang tải chính sách đổi/hủy...'}</p>;
  const deadline = departureAt ? DateVo.parseLocalDateTime(departureAt).getTime() - value.refundCutoffMinutes * 60000 : NaN;
  return <section aria-label="Chính sách hủy và hoàn tiền" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <h3 className="font-semibold">Hạn hủy và hoàn tiền</h3>
    <p>Không hỗ trợ tự hủy/đổi vé và hoàn tiền khi còn dưới <strong>{value.refundCutoffMinutes} phút</strong> trước giờ khởi hành.</p>
    {Number.isFinite(deadline) && <p>Hạn gửi yêu cầu: <strong>{new Date(deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}</strong> (giờ Việt Nam).</p>}
    <p>Từ {value.fullRefundMinutes} phút trước khởi hành: hoàn toàn bộ giá vé. Từ {value.refundCutoffMinutes} đến dưới {value.fullRefundMinutes} phút: phí {Number((Number(value.partialFeeRate) * 100).toFixed(2))}%.</p>
    <p>Nhà xe hủy chuyến được xử lý riêng. Nếu cần hỗ trợ, gửi phiếu trong mục Khiếu nại & Hoàn tiền.</p>
  </section>;
}
