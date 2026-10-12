import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingService } from '../../composition';
import type { OrderEntity } from '../../domain/entity/order.entity';
import {
  Clock,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Trash2,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { CustomerPageContainer } from '@/shared/presentation/components/layout/CustomerPageContainer';
import { ConfirmDialog } from '@/shared/presentation/components/forms/ConfirmDialog';
import { MoneyText } from '@/shared/presentation/components/data-display/MoneyText';
import { LoadingState } from '@/shared/presentation/components/feedback/LoadingState';
import { ErrorState } from '@/shared/presentation/components/feedback/ErrorState';

export const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hold countdown state in seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Payment launching state
  const [launching, setLaunching] = useState<boolean>(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Cancelling unpaid state & ConfirmDialog state
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);

  // Fetch Order
  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getOrder(orderId);
      setOrder(data);

      if (data.isConfirmed()) {
        navigate(`/account/orders/${orderId}`, { replace: true });
        return;
      }

      if (data.isCancelled()) {
        setIsExpired(true);
        return;
      }

      const seconds = data.getRemainingSeconds();
      setRemainingSeconds(seconds);
      if (seconds <= 0 && data.isPending()) {
        setIsExpired(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin đơn giữ chỗ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Countdown timer tick
  useEffect(() => {
    if (!order || isExpired || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order, isExpired, remainingSeconds]);

  // Launch GoPay payment
  const handleLaunchPayment = async () => {
    if (!orderId || isExpired) return;
    try {
      setLaunching(true);
      setLaunchError(null);
      const res = await bookingService.launchPayment(orderId);
      window.location.assign(res.url);
    } catch (err: unknown) {
      setLaunchError(err instanceof Error ? err.message : 'Không thể kết nối cổng thanh toán GoPay.');
      setLaunching(false);
    }
  };

  // Cancel unpaid hold action
  const handleConfirmCancel = async () => {
    if (!orderId) return;
    try {
      setCancelling(true);
      await bookingService.cancelUnpaidOrder(orderId);
      setShowCancelDialog(false);
      navigate('/search');
    } catch (err: unknown) {
      setLaunchError(err instanceof Error ? err.message : 'Không thể hủy đơn.');
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-16">
        <LoadingState count={3} message="Đang tải thông tin đơn đặt chỗ..." />
      </CustomerPageContainer>
    );
  }

  if (error || !order) {
    return (
      <CustomerPageContainer className="py-16">
        <ErrorState
          title="Không tìm thấy đơn hàng"
          error={error || 'Đơn hàng không tồn tại hoặc đã bị hủy.'}
          onRetry={() => navigate('/search')}
        />
      </CustomerPageContainer>
    );
  }

  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 120;

  return (
    <CustomerPageContainer className="space-y-6 pb-20">
      {/* Stepper Progress */}
      <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 p-4 sm:p-6 shadow-md">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-emerald-700">Chọn ghế</span>
          </div>
          <div className="flex-1 h-0.5 bg-emerald-500 mx-2" />

          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-emerald-700">Giữ chỗ</span>
          </div>
          <div className="flex-1 h-0.5 bg-[#FF385C] mx-2" />

          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="w-8 h-8 rounded-full bg-[#FF385C] text-white flex items-center justify-center font-black text-xs ring-4 ring-[#FFF0F2] shadow-xs glow-coral-sm">
              3
            </div>
            <span className="text-xs font-black text-[#FF385C]">Thanh toán</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="w-8 h-8 rounded-full bg-white/80 border border-gray-200/60 text-gray-400 flex items-center justify-center font-bold text-xs shadow-2xs">
              4
            </div>
            <span className="text-xs font-semibold text-gray-400">Nhận vé QR</span>
          </div>
        </div>
      </div>

      {/* Expiration Banner */}
      {isExpired ? (
        <div className="p-5 sm:p-6 bg-rose-50/90 backdrop-blur-md rounded-3xl border border-rose-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5 text-rose-700">
            <div className="w-10 h-10 rounded-2xl bg-rose-100/90 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Thời gian giữ chỗ 15 phút đã kết thúc</h4>
              <p className="text-xs text-rose-600/90 mt-0.5">
                Các ghế đã được tự động giải phóng. Vui lòng chọn lại chuyến để tiếp tục đặt vé.
              </p>
            </div>
          </div>
          <Link
            to="/search"
            className="px-6 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-full hover:bg-rose-700 shadow-xs transition-colors shrink-0"
          >
            Tìm chuyến xe khác
          </Link>
        </div>
      ) : (
        <div
          className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md transition-all ${
            isLowTime
              ? 'bg-amber-50/90 border-amber-300 text-amber-900'
              : 'bg-white/85 border-white/80 text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                isLowTime ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-[#FFF0F2] text-[#FF385C] border border-[#FF385C]/20'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Ghế đang được khóa giữ trên hệ thống</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Vui lòng hoàn tất thanh toán trước khi hết thời gian giữ chỗ an toàn.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-gray-400 block font-bold uppercase tracking-wider">
              Thời gian còn lại
            </span>
            <span
              className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${
                isLowTime ? 'text-amber-600 animate-pulse' : 'text-[#FF385C]'
              }`}
            >
              {formatTimer(remainingSeconds)}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Order Details & Tickets */}
        <div className="lg:col-span-7 space-y-6">
          {/* Order Header Card */}
          <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-white/80 p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100/80 pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Mã đơn đặt vé
                </span>
                <p className="text-base font-black text-gray-900 font-mono mt-0.5">
                  {order.orderNumber}
                </p>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-[#FFF0F2] text-[#FF385C] border border-[#FF385C]/20 text-xs font-bold shadow-2xs">
                {order.items.length} vé xe khách
              </span>
            </div>

            {/* Buyer Contact */}
            <div className="space-y-1 text-xs sm:text-sm">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                Người liên hệ nhận vé
              </span>
              <p className="font-bold text-gray-900 text-sm">{order.customerInfo.fullName}</p>
              <p className="text-xs text-gray-500">
                Email: <span className="font-semibold text-gray-700">{order.customerInfo.email}</span> · SĐT:{' '}
                <span className="font-semibold text-gray-700 tabular-nums">{order.customerInfo.phone}</span>
              </p>
            </div>
          </div>

          {/* Ticket Items Cards */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-base text-[#111827]">
              Danh sách vé giữ chỗ ({order.items.length} ghế)
            </h3>

            {order.items.map((item, idx) => (
              <div
                key={item.itemId || idx}
                className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/90 p-5 flex items-center justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#FF385C] px-2 py-0.5 rounded-md bg-[#FFF0F2]">
                      Ghế {item.transportSeatCode}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-sm font-bold text-gray-900">
                      {item.passengerName}
                    </span>
                  </div>
                  {item.listingTitle && (
                    <p className="text-xs text-gray-500 font-medium">{item.listingTitle}</p>
                  )}
                </div>

                <div className="text-right">
                  <MoneyText amount={item.transportFareVnd.toString()} size="sm" variant="ink" />
                </div>
              </div>
            ))}
          </div>

          {/* Cancel Unpaid Option */}
          {!isExpired && (
            <div className="pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelDialog(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hủy giữ chỗ này nếu bạn muốn đổi ý và giải phóng ghế</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Payment Panel */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 p-6 sm:p-7 space-y-6 shadow-md">
            <h3 className="font-bold text-base text-[#111827] border-b border-gray-100 pb-3">
              Chi tiết thanh toán
            </h3>

            {/* Fare Breakdown */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span>Tổng giá vé ({order.items.length} ghế)</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  <MoneyText amount={order.totalAmount.toString()} size="sm" variant="ink" />
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Phí dịch vụ</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                  Miễn phí
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">Tổng thanh toán</span>
                <MoneyText amount={order.totalAmount.toString()} size="2xl" variant="coral" />
              </div>
            </div>

            {/* Launch Error */}
            {launchError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{launchError}</span>
              </div>
            )}

            {/* Launch CTA */}
            {!isExpired && (
              <button
                type="button"
                disabled={launching}
                onClick={handleLaunchPayment}
                className={`
                  w-full py-4 rounded-full font-bold text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer
                  ${
                    launching
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-[#FF385C] hover:bg-[#E61E4F] glow-coral active:scale-95'
                  }
                `}
              >
                {launching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối cổng GoPay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Thanh toán an toàn bằng GoPay</span>
                  </>
                )}
              </button>
            )}

            {/* Guarantees */}
            <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bảo mật giao dịch đa tầng qua GoPay / VNPAY.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF385C] shrink-0" />
                <span>Nhận mã vé điện tử QR tức thì sau khi thanh toán.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog replacing window.confirm */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Hủy lượt giữ chỗ này?"
        description="Khi hủy, ghế đã chọn sẽ được mở lại ngay lập tức cho các khách hàng khác. Bạn sẽ cần chọn lại chuyến nếu muốn đặt vé sau này."
        confirmLabel="Xác nhận hủy giữ chỗ"
        cancelLabel="Quay lại"
        variant="danger"
        loading={cancelling}
        onConfirm={handleConfirmCancel}
      />
    </CustomerPageContainer>
  );
};
