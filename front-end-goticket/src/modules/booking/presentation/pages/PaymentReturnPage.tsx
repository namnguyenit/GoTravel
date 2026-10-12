import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../../composition';
import type { OrderEntity } from '../../domain/entity/order.entity';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  QrCode,
  RotateCcw,
} from 'lucide-react';
import { CustomerPageContainer } from '@/shared/presentation/components/layout/CustomerPageContainer';
import { MoneyText } from '@/shared/presentation/components/data-display/MoneyText';

export const PaymentReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);

  const checkStatus = async () => {
    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng trong liên kết trở về.');
      setLoading(false);
      return;
    }

    try {
      const data = await bookingService.getOrder(orderId);
      setOrder(data);

      if (data.isConfirmed()) {
        setLoading(false);
        return;
      }

      if (data.isCancelled()) {
        setLoading(false);
        return;
      }

      // If still pending, poll up to 8 times (every 3 seconds)
      if (pollCount < 8) {
        setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 3000);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể kiểm tra trạng thái đơn.');
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [orderId, pollCount]);

  if (!orderId) {
    return (
      <CustomerPageContainer className="py-16">
        <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-gray-200/90 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Thiếu thông tin đơn hàng</h3>
          <p className="text-xs text-gray-500">Liên kết thanh toán trở về không hợp lệ hoặc thiếu mã đơn hàng.</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex px-6 py-2.5 bg-[#111827] hover:bg-[#FF385C] text-white text-xs font-bold rounded-full transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </CustomerPageContainer>
    );
  }

  const isConfirmed = order?.isConfirmed();
  const isCancelled = order?.isCancelled();
  const isPending = order?.isPending();

  return (
    <CustomerPageContainer className="py-12">
      <div className="max-w-xl mx-auto bg-white/85 backdrop-blur-2xl rounded-[32px] border border-white/80 p-8 sm:p-10 shadow-2xl text-center space-y-6">
        {loading || (isPending && pollCount < 8) ? (
          <div className="space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Đang xác nhận kết quả thanh toán...
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Hệ thống đang đồng bộ xác thực giao dịch từ cổng thanh toán GoPay. Vui lòng giữ nguyên màn hình trong giây lát.
            </p>
            <div className="text-xs text-gray-400 font-medium tabular-nums pt-2">
              Lần kiểm tra: {pollCount + 1} / 8
            </div>
          </div>
        ) : isConfirmed && order ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Thanh toán thành công
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] font-editorial tracking-tight pt-1">
                Vé xe điện tử của bạn đã được phát hành!
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Mã đơn hàng: <strong className="font-mono text-gray-900 font-bold">{order.orderNumber}</strong>
              </p>
            </div>

            {/* Ticket details summary */}
            <div className="p-5 bg-[#FAF9F6] rounded-2xl border border-gray-200/60 text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span>Số lượng vé</span>
                <span className="font-bold text-gray-900 tabular-nums">{order.items.length} vé</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Ghế đã đặt</span>
                <span className="font-black text-[#FF385C]">
                  {order.items.map((i) => i.transportSeatCode).join(', ')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-gray-500">
                <span className="font-bold text-gray-900">Tổng thanh toán</span>
                <MoneyText amount={order.totalAmount.toString()} size="lg" variant="coral" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={`/account/orders/${order.orderId}`}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs sm:text-sm font-bold glow-coral-sm transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Xem vé & Mã QR lên xe</span>
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                <span>Về trang chủ</span>
              </Link>
            </div>
          </div>
        ) : isCancelled ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Đơn giữ chỗ đã hết hạn hoặc bị hủy
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Giao dịch chưa hoàn tất trong thời gian quy định 15 phút. Ghế đã được tự động giải phóng.
              </p>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs sm:text-sm font-bold transition-all glow-coral-sm"
            >
              <span>Tìm chuyến xe khác</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Giao dịch đang chờ hoàn tất
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Cổng thanh toán chưa gửi xác nhận cuối cùng. Bạn có thể kiểm tra lại trong danh sách vé đã đặt.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => checkStatus()}
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#111827] hover:bg-[#FF385C] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Kiểm tra lại
              </button>
              <Link
                to={order ? `/account/orders/${order.orderId}` : '/account/tickets'}
                className="px-6 py-3 rounded-full border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50"
              >
                Đến vé của tôi
              </Link>
            </div>
          </div>
        )}
      </div>
    </CustomerPageContainer>
  );
};
