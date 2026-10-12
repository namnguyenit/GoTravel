import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingService } from '../../composition';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import type { OrderEntity, OrderItemEntity } from '../../domain/entity/order.entity';
import type { CancelPreviewResult } from '../../application/port/booking.service.interface';
import { QrCodeView } from '@/shared/presentation/components/QrCodeView';
import { DateVo } from '@/shared/domain/date.vo';
import {
  Ticket,
  Printer,
  RotateCcw,
  Ban,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Mail,
  X,
  PencilLine,
  Star,
  ChevronRight,
} from 'lucide-react';
import { CustomerPageContainer } from '@/shared/presentation/components/layout/CustomerPageContainer';
import { StatusBadge } from '@/shared/presentation/components/feedback/StatusBadge';
import { MoneyText } from '@/shared/presentation/components/data-display/MoneyText';
import { LoadingState } from '@/shared/presentation/components/feedback/LoadingState';
import { ErrorState } from '@/shared/presentation/components/feedback/ErrorState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const CustomerOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const [order, setOrder] = useState<OrderEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancelModalItem, setCancelModalItem] = useState<OrderItemEntity | null>(null);
  const [cancelPreview, setCancelPreview] = useState<CancelPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [cancelOperationId, setCancelOperationId] = useState<string | null>(null);
  const [operationState, setOperationState] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [reviewItem, setReviewItem] = useState<OrderItemEntity | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  const operationStorageKey = (itemId: string) => `goticket:cancel:${orderId || 'unknown'}:${itemId}`;
  const terminalOperationStates = new Set([
    'COMPLETED',
    'REFUND_PENDING',
    'ABORTED',
    'ABORT_REFUND_PENDING',
  ]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getOrder(orderId);
      setOrder(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!cancelOperationId || !cancelModalItem || !cancelSuccessMsg) return;
    let disposed = false;
    let timer: number | undefined;

    const refreshOperation = async () => {
      try {
        const operation = await bookingService.getItemOperation(cancelOperationId);
        if (disposed) return;
        const nextState = String(operation?.state || 'SUBMITTED');
        setOperationState(nextState);
        await fetchOrder();
        if (terminalOperationStates.has(nextState)) {
          sessionStorage.removeItem(operationStorageKey(cancelModalItem.itemId));
          if (timer) window.clearInterval(timer);
        }
      } catch {
        // Retain operationId for offline resilience
      }
    };

    void refreshOperation();
    timer = window.setInterval(refreshOperation, 2000);
    return () => {
      disposed = true;
      if (timer) window.clearInterval(timer);
    };
  }, [cancelOperationId, cancelModalItem, cancelSuccessMsg]);

  // Open Cancel Modal & load preview
  const handleOpenCancelModal = async (item: OrderItemEntity) => {
    if (!orderId) return;
    setCancelModalItem(item);
    setCancelPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setCancelSuccessMsg(null);
    setOperationState(null);
    const storageKey = operationStorageKey(item.itemId);
    const opId = sessionStorage.getItem(storageKey) || crypto.randomUUID();
    sessionStorage.setItem(storageKey, opId);
    setCancelOperationId(opId);

    try {
      const preview = await bookingService.previewCancelItem(orderId, item.itemId);
      setCancelPreview(preview);
    } catch (err: unknown) {
      setCancelPreview(null);
      setPreviewError(
        err instanceof Error
          ? err.message
          : 'Không thể tính toán chính sách hoàn vé từ máy chủ. Vé có thể không đủ điều kiện hủy.'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm cancel item
  const handleConfirmCancelItem = async () => {
    if (!orderId || !cancelModalItem || !cancelPreview || !cancelOperationId) return;

    try {
      setCancelling(true);
      await bookingService.cancelItem(
        orderId,
        cancelModalItem.itemId,
        cancelOperationId,
        'Khách hàng chủ động yêu cầu hủy vé trực tuyến'
      );

      setCancelSuccessMsg(
        'Yêu cầu hủy vé đã được gửi thành công. Hệ thống đang tiến hành thủ tục hoàn tiền.'
      );
      setOperationState('SUBMITTED');
      await fetchOrder();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hủy vé không thành công.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendEmail = async () => {
    if (!orderId) return;
    try {
      setSendingEmail(true);
      setEmailMessage('');
      const res = await httpClient.post<{ message?: string }>(`/api/v1/orders/${orderId}/send-email`);
      setEmailMessage(res?.message || 'Đã gửi lại vé điện tử và biên nhận vào hòm thư của bạn.');
    } catch (err: unknown) {
      setEmailMessage(err instanceof Error ? err.message : 'Không thể gửi email lúc này.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewItem?.listingId) return;
    try {
      setReviewing(true);
      setReviewMessage('');
      await httpClient.post('/api/v1/customer/reviews', {
        listingId: reviewItem.listingId,
        orderItemId: reviewItem.itemId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewMessage('Cảm ơn bạn đã gửi đánh giá cho chuyến đi!');
      setTimeout(() => {
        setReviewItem(null);
      }, 1500);
    } catch (err: unknown) {
      setReviewMessage(err instanceof Error ? err.message : 'Không thể gửi đánh giá.');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-16">
        <LoadingState count={3} message="Đang tải thông tin chi tiết vé điện tử..." />
      </CustomerPageContainer>
    );
  }

  if (error || !order) {
    return (
      <CustomerPageContainer className="py-16">
        <ErrorState
          title="Không thể tải chi tiết đơn hàng"
          error={error || 'Đơn hàng không tồn tại.'}
          onRetry={() => window.location.reload()}
        />
      </CustomerPageContainer>
    );
  }

  return (
    <CustomerPageContainer className="space-y-6 pb-20">
      {/* Breadcrumb Navigation & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link to="/" className="hover:text-gray-900 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/account/tickets" className="hover:text-gray-900 transition-colors">Vé của tôi</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="font-bold text-gray-800 font-mono">#{order.orderNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="rounded-full text-xs font-semibold h-9 px-4 border-gray-200"
          >
            {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
            <span>Gửi lại Email</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-full text-xs font-semibold h-9 px-4 border-gray-200"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            <span>In vé điện tử</span>
          </Button>
        </div>
      </div>

      {emailMessage && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-xs text-blue-800 rounded-2xl font-medium print:hidden">
          {emailMessage}
        </div>
      )}

      {/* Order Overview Card */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Mã đơn hàng
              </span>
              <StatusBadge status={order.status} size="sm" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-mono mt-1">
              {order.orderNumber}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Tổng thanh toán
            </span>
            <div className="mt-0.5">
              <MoneyText amount={order.totalAmount.toString()} size="2xl" variant="coral" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-500">
          <div>
            <span className="block text-gray-400 font-medium">Người liên hệ</span>
            <strong className="text-sm text-gray-900 font-bold">{order.customerInfo.fullName}</strong>
          </div>
          <div>
            <span className="block text-gray-400 font-medium">Email nhận vé</span>
            <strong className="text-sm text-gray-900 font-bold">{order.customerInfo.email}</strong>
          </div>
          <div>
            <span className="block text-gray-400 font-medium">Số điện thoại</span>
            <strong className="text-sm text-gray-900 font-bold tabular-nums">{order.customerInfo.phone}</strong>
          </div>
        </div>
      </div>

      {/* Ticket Cards Listing */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-[#FF385C]" />
          Danh sách vé lên xe ({order.items.length} vé)
        </h2>

        {order.items.map((item, index) => {
          const isInvalidTicket =
            ['CANCELLED', 'VOID', 'REFUNDED', 'REFUND_PENDING', 'NO_SHOW', 'EXCHANGED', 'EXPIRED', 'ABORTED'].includes(
              item.transportItemState || ''
            ) || ['CANCELLED', 'VOID', 'NO_SHOW'].includes(item.transportBoardingStatus || '');
          const isBoarded = item.transportBoardingStatus === 'CHECKED_IN';
          const isOperationPending = item.transportItemState === 'OPERATION_PENDING';
          const hasValidToken = Boolean(item.transportCheckInToken && item.transportCheckInToken.trim());

          return (
            <div
              key={item.itemId || index}
              className={`
                bg-white rounded-3xl border p-6 sm:p-7 shadow-2xs space-y-6 transition-all
                ${isInvalidTicket ? 'border-rose-200 bg-rose-50/20' : 'border-gray-200/90'}
              `}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Ticket Info */}
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-2xl font-black text-[#FF385C] tabular-nums">
                      Ghế {item.transportSeatCode}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                      Hành khách: {item.passengerName}
                    </span>
                    {item.transportTicketRevision > 1 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Phiên bản R{item.transportTicketRevision}
                      </span>
                    )}
                    {isInvalidTicket ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                        {item.transportItemState === 'REFUNDED'
                          ? 'Đã hoàn tiền'
                          : item.transportItemState === 'VOID'
                          ? 'Vé bị thu hồi'
                          : item.transportItemState === 'NO_SHOW' || item.transportBoardingStatus === 'NO_SHOW'
                          ? 'Vắng mặt'
                          : item.transportItemState === 'EXCHANGED'
                          ? 'Đã đổi vé'
                          : 'Đã hủy'}
                      </span>
                    ) : isBoarded ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700">
                        Đã soát vé lên xe
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        Vé hợp lệ
                      </span>
                    )}
                  </div>

                  {item.listingTitle && (
                    <p className="text-base font-bold text-gray-900">
                      {item.listingTitle}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100">
                    {item.transportDepartureAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#FF385C]" />
                        <span>Giờ đi: <strong>{DateVo.formatVietnamDateTime(item.transportDepartureAt)}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Giá vé:</span>
                      <MoneyText amount={item.transportFareVnd.toString()} size="sm" variant="coral" />
                    </div>
                  </div>

                  {/* Actions for valid tickets */}
                  {!isInvalidTicket && !isBoarded && !isOperationPending && item.transportItemState === 'ACTIVE' && order.isConfirmed() && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 print:hidden">
                      <Link
                        to={`/account/orders/${order.orderId}/items/${item.itemId}/amend`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        <span>Sửa thông tin</span>
                      </Link>
                      <Link
                        to={`/account/orders/${order.orderId}/items/${item.itemId}/exchange`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Đổi chuyến/ghế</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-full border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Hủy vé & Hoàn tiền</span>
                      </button>
                    </div>
                  )}

                  {order.status === 'COMPLETED' && item.listingId && !isInvalidTicket && (
                    <div className="pt-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewItem(item);
                          setReviewRating(5);
                          setReviewComment('');
                          setReviewMessage('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Đánh giá chuyến đi
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: QR Code for boarding */}
                {isInvalidTicket ? (
                  <div className="flex flex-col items-center justify-center p-5 bg-rose-50/50 rounded-2xl border border-rose-200 shrink-0 text-center sm:w-[200px]">
                    <X className="w-8 h-8 text-rose-600 mb-2" />
                    <span className="text-xs font-bold text-rose-700">Vé không còn hiệu lực</span>
                    <span className="text-[11px] text-rose-500 mt-0.5">Không thể dùng mã QR để lên xe</span>
                  </div>
                ) : isBoarded ? (
                  <div className="flex flex-col items-center justify-center p-5 bg-purple-50/50 rounded-2xl border border-purple-200 shrink-0 text-center sm:w-[200px]">
                    <CheckCircle2 className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-xs font-bold text-purple-700">Đã hoàn tất check-in</span>
                    <span className="text-[11px] text-purple-500 mt-0.5">Mã QR đã được quét lên xe</span>
                  </div>
                ) : isOperationPending ? (
                  <div className="flex sm:w-[200px] shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-center">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-amber-600" />
                    <span className="text-xs font-bold text-amber-800">Đang xử lý yêu cầu</span>
                    <span className="mt-0.5 text-[11px] text-amber-600">Vé tạm khóa đến khi xử lý xong</span>
                  </div>
                ) : hasValidToken && item.transportItemState === 'ACTIVE' ? (
                  <div className="flex flex-col items-center justify-center p-5 bg-[#FAF9F6] rounded-2xl border border-gray-200/80 shrink-0 text-center sm:w-[200px]">
                    <div className="p-3 bg-white rounded-xl shadow-2xs border border-gray-200/60">
                      <QrCodeView value={item.transportCheckInToken!} size={140} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 mt-2 block uppercase tracking-wider">
                      Mã soát vé lên xe
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 mt-0.5 block max-w-[140px] truncate">
                      {item.transportCheckInToken}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 shrink-0 text-center sm:w-[200px]">
                    <Clock className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs font-bold text-gray-600">Chưa có mã QR</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancellation Modal with Financial Breakdown */}
      <Dialog open={Boolean(cancelModalItem)} onOpenChange={(val) => !val && setCancelModalItem(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-6 sm:p-7 border-gray-100 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
              Xác nhận hủy vé & Hoàn tiền
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Kiểm tra kỹ chính sách hoàn tiền trước khi gửi yêu cầu hủy vé.
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="py-12 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#FF385C] mb-2" />
              <p className="text-xs font-semibold">Đang tính toán chính sách hoàn tiền từ hệ thống...</p>
            </div>
          ) : previewError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              {previewError}
            </div>
          ) : cancelPreview ? (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-gray-200/80 space-y-2.5">
                <div className="flex justify-between text-gray-600">
                  <span>Giá vé gốc:</span>
                  <MoneyText amount={cancelPreview.originalFareVnd} size="xs" variant="ink" />
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Phí hủy vé:</span>
                  <span>- {cancelPreview.penaltyVnd} ₫</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                  <span>Số tiền được hoàn:</span>
                  <MoneyText amount={cancelPreview.refundAmountVnd} size="base" variant="coral" />
                </div>
              </div>

              {cancelSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-medium">
                  {cancelSuccessMsg}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  * Số tiền hoàn sẽ được hoàn trả tự động vào phương thức thanh toán ban đầu của bạn theo quy trình ngân hàng.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => setCancelModalItem(null)}
              className="rounded-full px-5 text-xs font-semibold h-10 border-gray-200"
            >
              {cancelSuccessMsg ? 'Đóng' : 'Quay lại'}
            </Button>
            {!cancelSuccessMsg && cancelPreview && (
              <Button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancelItem}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-5 text-xs font-bold h-10 transition-colors"
              >
                {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Xác nhận hủy vé
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={Boolean(reviewItem)} onOpenChange={(val) => !val && setReviewItem(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-6 sm:p-7 border-gray-100 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
              Đánh giá trải nghiệm chuyến đi
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Ý kiến của bạn giúp nhà xe nâng cao chất lượng dịch vụ trên GoTicket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= reviewRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nhận xét chi tiết
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm về tài xế, độ đúng giờ, sự tiện nghi của xe..."
                rows={3}
                className="w-full rounded-2xl border border-gray-200 p-3 text-xs sm:text-sm text-gray-900 focus:outline-hidden focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/15 transition-all resize-none"
              />
            </div>

            {reviewMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                {reviewMessage}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={reviewing}
              onClick={() => setReviewItem(null)}
              className="rounded-full px-5 text-xs font-semibold h-10 border-gray-200"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={reviewing}
              onClick={handleSubmitReview}
              className="bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-full px-5 text-xs font-bold h-10 transition-all glow-coral-sm"
            >
              {reviewing && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Gửi đánh giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerPageContainer>
  );
};
