import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { DateVo } from '@/shared/domain/date.vo';
import {
  CustomerPageContainer,
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  EmptyState,
  LoadingState,
} from '@/shared/presentation/components';
import { AlertCircle, ArrowLeft, CheckCircle2, MessageSquareWarning, Plus, Send } from 'lucide-react';

interface DisputeItem {
  disputeId: string;
  orderId: string;
  orderNumber?: string;
  reason: string;
  description?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
}

export const CustomerDisputesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await httpClient.get<any>('/api/v1/orders/disputes', { params: { page: 0, size: 50 } });
      const page = response?.data || response;
      setItems(Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách khiếu nại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderId.trim() || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await httpClient.post('/api/v1/orders/disputes', {
        orderId: orderId.trim(),
        reason: reason.trim(),
        description: description.trim() || undefined,
      });
      setReason('');
      setDescription('');
      setSuccess('Khiếu nại đã được gửi thành công. Quản trị viên và nhà xe sẽ kiểm tra và phản hồi sớm.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi khiếu nại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerPageContainer className="space-y-6 py-8">
      <Link
        to="/account/tickets"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gt-muted)] transition-colors hover:text-[var(--gt-coral)]"
      >
        <ArrowLeft className="h-4 w-4" /> Vé của tôi
      </Link>

      <PageHeader
        title="Khiếu nại & Hỗ trợ đơn vé"
        description="Gửi phản ánh hoặc yêu cầu hỗ trợ gắn liền với đơn vé cụ thể. Đội ngũ vận hành GoTicket sẽ phản hồi trực tiếp trên phiếu hỗ trợ này."
        eyebrow="Trung tâm hỗ trợ khách hàng"
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Form tạo khiếu nại (5 cols on desktop) */}
        <div className="lg:col-span-5">
          <SurfaceCard variant="glass" className="p-6 md:p-8">
            <div className="flex items-center gap-2.5 border-b border-gray-100/80 pb-4">
              <Plus className="h-5 w-5 text-coral" />
              <h2 className="text-base font-bold text-gray-900">
                Tạo yêu cầu khiếu nại mới
              </h2>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Mã đơn hàng liên quan <span className="text-coral">*</span>
                </label>
                <input
                  required
                  maxLength={36}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 font-mono text-sm font-semibold text-gray-900 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 shadow-2xs"
                  placeholder="Mã đơn vé (UUID)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Vấn đề cần hỗ trợ <span className="text-coral">*</span>
                </label>
                <input
                  required
                  maxLength={255}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 shadow-2xs"
                  placeholder="Ví dụ: Chưa nhận tiền hoàn vé..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Mô tả chi tiết nội dung
                </label>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-3xl border border-gray-200/80 bg-white/90 p-4 text-sm font-medium text-gray-900 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 shadow-2xs resize-none"
                  placeholder="Cung cấp mốc thời gian, chi tiết trao đổi với tài xế hoặc thắc mắc về tiền vé..."
                />
              </div>

              {error && (
                <InlineAlert variant="error" title="Lỗi gửi khiếu nại" message={error} />
              )}
              {success && (
                <InlineAlert variant="success" title="Thành công" message={success} />
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white py-3.5 text-sm font-bold shadow-md glow-coral-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Đang gửi khiếu nại...' : 'Gửi yêu cầu hỗ trợ'}
              </button>
            </form>
          </SurfaceCard>
        </div>

        {/* Danh sách lịch sử khiếu nại (7 cols on desktop) */}
        <div className="space-y-4 lg:col-span-7">
          <h2 className="text-base font-bold text-gray-900">
            Lịch sử các yêu cầu đã gửi ({items.length})
          </h2>

          {loading ? (
            <SurfaceCard variant="glass" className="p-8">
              <LoadingState message="Đang tải danh sách khiếu nại..." />
            </SurfaceCard>
          ) : items.length === 0 ? (
            <SurfaceCard variant="glass" className="p-8">
              <EmptyState
                icon={MessageSquareWarning}
                title="Chưa có khiếu nại nào"
                description="Tất cả các đơn vé của bạn hiện đang ở trạng thái bình thường. Nếu gặp sự cố trong quá trình đi xe hoặc thanh toán, hãy tạo yêu cầu tại đây."
              />
            </SurfaceCard>
          ) : (
            items.map((item) => (
              <SurfaceCard key={item.disputeId} variant="glass" className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{item.reason}</h3>
                    <p className="mt-1 font-mono text-xs text-gray-400">
                      Đơn hàng: {item.orderNumber || item.orderId}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {item.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {item.description}
                  </p>
                )}

                {item.adminNote && (
                  <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 backdrop-blur-xs p-4 shadow-2xs">
                    <p className="text-xs font-bold text-gray-900">
                      Phản hồi từ quản trị viên GoTicket:
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{item.adminNote}</p>
                  </div>
                )}

                <p className="mt-4 text-[11px] font-semibold text-gray-400">
                  Thời gian gửi: {DateVo.formatVietnamDateTime(item.createdAt)}
                </p>
              </SurfaceCard>
            ))
          )}
        </div>
      </div>
    </CustomerPageContainer>
  );
};
