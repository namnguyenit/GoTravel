import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingService } from '../../composition';
import type { ItemOperationView } from '../../application/port/booking.service.interface';
import {
  CustomerPageContainer,
  SurfaceCard,
  MoneyText,
  StatusBadge,
  InlineAlert,
  IdText,
  LoadingState,
  ErrorState,
  OperationTimeline,
} from '@/shared/presentation/components';
import { ArrowLeft, CheckCircle2, Clock, CreditCard, RefreshCw, Undo2 } from 'lucide-react';

const terminalStates = new Set(['COMPLETED', 'REFUND_PENDING', 'ABORTED', 'ABORT_REFUND_PENDING']);
const retryableStates = new Set(['PREPARED', 'HELD', 'WAITING_FUNDS', 'COMMITTING', 'TICKET_COMMITTED', 'SETTLING', 'ABORTING']);

const stateLabel = (state: string) => ({
  PREPARED: 'Đã tiếp nhận yêu cầu',
  HELD: 'Đã khóa giữ chỗ mới',
  WAITING_FUNDS: 'Chờ thanh toán chênh lệch',
  COMMITTING: 'Đang xác nhận đổi vé',
  TICKET_COMMITTED: 'Đã phát hành phiên bản vé mới',
  SETTLING: 'Đang đối soát hoàn/thu',
  COMPLETED: 'Đã hoàn tất thành công',
  REFUND_PENDING: 'Đã đổi vé, chờ hoàn tiền',
  ABORTING: 'Đang hoàn tác vé cũ',
  ABORTED: 'Đã dừng, giữ nguyên vé cũ',
  ABORT_REFUND_PENDING: 'Đã dừng, chờ hoàn tiền',
}[state] || state);

export const OperationProgressPage: React.FC = () => {
  const { operationId } = useParams<{ operationId: string }>();
  const [operation, setOperation] = useState<ItemOperationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const load = useCallback(async (quiet = false) => {
    if (!operationId) return;
    if (!quiet) setLoading(true);
    try {
      const result = await bookingService.getItemOperation(operationId);
      setOperation(result);
      setError(null);
      setLastUpdated(new Date());
      if (terminalStates.has(result.state)) {
        sessionStorage.removeItem(`goticket:operation:${operationId}`);
      }
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : 'Không thể đọc tiến trình xử lý vé.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [operationId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !terminalStates.has(operation?.state || '')) void load(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [load, operation?.state]);

  const runAction = async (kind: 'retry' | 'abort' | 'pay') => {
    if (!operationId) return;
    setActing(true);
    setError(null);
    try {
      if (kind === 'pay') {
        const handoff = await bookingService.launchOperationPayment(operationId);
        window.location.assign(handoff.url);
        return;
      }
      const result = kind === 'retry'
        ? await bookingService.retryItemOperation(operationId)
        : await bookingService.abortItemOperation(operationId);
      setOperation(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thực hiện thao tác.');
    } finally {
      setActing(false);
    }
  };

  if (!operationId) {
    return (
      <CustomerPageContainer className="py-16 text-center">
        <ErrorState title="Mã tiến trình không hợp lệ" message="Liên kết không chứa mã tiến trình hợp lệ." />
      </CustomerPageContainer>
    );
  }

  const isTerminal = terminalStates.has(operation?.state || '');

  return (
    <CustomerPageContainer className="max-w-3xl space-y-6 py-8">
      <Link
        to="/account/tickets"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gt-muted)] transition-colors hover:text-[var(--gt-coral)]"
      >
        <ArrowLeft className="h-4 w-4" /> Danh sách vé của tôi
      </Link>

      <SurfaceCard variant="glass-elevated" className="overflow-hidden p-6 sm:p-8 rounded-[32px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                {operation?.kind === 'EXCHANGE' ? 'Tiến trình đổi vé' : 'Tiến trình hủy vé'}
              </span>
              {!isTerminal && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin text-coral" /> Đang đồng bộ
                </span>
              )}
            </div>
            <h1 className="mt-1 font-serif text-2xl font-bold text-gray-900">
              {operation ? stateLabel(operation.state) : 'Đang xử lý yêu cầu...'}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Mã yêu cầu:</span>
              <IdText id={operationId} />
            </div>
          </div>

          {operation && <StatusBadge status={operation.state} />}
        </div>

        {loading && !operation ? (
          <div className="py-12">
            <LoadingState message="Đang kết nối hệ thống cập nhật tiến trình..." />
          </div>
        ) : error && !operation ? (
          <div className="py-8">
            <ErrorState
              title="Không thể tải tiến trình"
              message={error}
              actionLabel="Thử kết nối lại"
              onAction={() => void load()}
            />
          </div>
        ) : operation ? (
          <div className="mt-6 space-y-6">
            {/* Visual Timeline */}
            <div className="rounded-3xl border border-white/80 bg-white/70 backdrop-blur-xs p-5 shadow-2xs">
              <OperationTimeline
                currentState={operation.state}
                kind={operation.kind}
              />
            </div>

            {/* Error banner if any */}
            {operation.error && (
              <InlineAlert
                variant="error"
                title="Cảnh báo tiến trình"
                message={operation.error}
              />
            )}

            {/* Breakdown table */}
            <div className="rounded-3xl border border-white/80 bg-white/60 backdrop-blur-xs p-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Chi tiết tài chính
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/80 border border-white/80 p-3 shadow-2xs">
                  <span className="text-xs text-gray-400 font-medium">Giá trị vé cũ</span>
                  <div className="mt-1">
                    <MoneyText amount={operation.oldAmount} size="sm" weight="bold" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 border border-white/80 p-3 shadow-2xs">
                  <span className="text-xs text-gray-400 font-medium">Giá vé mới</span>
                  <div className="mt-1">
                    <MoneyText amount={operation.newAmount} size="sm" weight="bold" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 border border-white/80 p-3 shadow-2xs">
                  <span className="text-xs text-gray-400 font-medium">Phí thao tác</span>
                  <div className="mt-1">
                    <MoneyText amount={operation.fee} size="sm" weight="bold" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 border border-white/80 p-3 shadow-2xs">
                  <span className="text-xs text-gray-400 font-medium">Phải trả thêm</span>
                  <div className="mt-1">
                    <MoneyText amount={operation.topup} size="sm" weight="bold" variant="coral" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 border border-white/80 p-3 shadow-2xs">
                  <span className="text-xs text-gray-400 font-medium">Dự kiến hoàn</span>
                  <div className="mt-1">
                    <MoneyText amount={operation.refundDue} size="sm" weight="bold" />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <InlineAlert variant="error" title="Lỗi thao tác" message={error} />
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {operation.state === 'WAITING_FUNDS' && Number(operation.topup) > 0 && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void runAction('pay')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white py-3.5 text-sm font-bold shadow-md glow-coral-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="h-4 w-4" />
                  Thanh toán thêm <MoneyText amount={operation.topup} size="sm" weight="bold" />
                </button>
              )}

              {retryableStates.has(operation.state) && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void runAction('retry')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#111827] py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${acting ? 'animate-spin' : ''}`} />
                  {acting ? 'Đang gửi...' : 'Kiểm tra & Thử tiếp'}
                </button>
              )}

              {['PREPARED', 'HELD', 'WAITING_FUNDS'].includes(operation.state) && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void runAction('abort')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white/90 px-5 py-3.5 text-sm font-bold text-gray-600 transition hover:border-rose-300 hover:text-rose-600 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Undo2 className="h-4 w-4" /> Dừng thao tác
                </button>
              )}
            </div>

            {operation.orderId && (
              <div className="border-t border-gray-100/80 pt-4 text-center">
                <Link
                  to={`/account/orders/${operation.orderId}`}
                  className="text-xs font-bold text-coral hover:underline"
                >
                  Xem chi tiết đơn vé liên quan →
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </SurfaceCard>
    </CustomerPageContainer>
  );
};
