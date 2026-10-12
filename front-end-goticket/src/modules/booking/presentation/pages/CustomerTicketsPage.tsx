import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../composition';
import type { OrderEntity } from '../../domain/entity/order.entity';
import {
  Ticket,
  Calendar,
  Clock,
  ArrowRight,
  QrCode,
  Search,
} from 'lucide-react';
import { CustomerPageContainer } from '@/shared/presentation/components/layout/CustomerPageContainer';
import { PageHeader } from '@/shared/presentation/components/layout/PageHeader';
import { StatusBadge } from '@/shared/presentation/components/feedback/StatusBadge';
import { MoneyText } from '@/shared/presentation/components/data-display/MoneyText';
import { Pagination } from '@/shared/presentation/components/data-display/Pagination';
import { EmptyState } from '@/shared/presentation/components/feedback/EmptyState';
import { LoadingState } from '@/shared/presentation/components/feedback/LoadingState';
import { ErrorState } from '@/shared/presentation/components/feedback/ErrorState';

export const CustomerTicketsPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchOrders = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingService.getUserOrders(targetPage, 10);
      setOrders(res.orders);
      setTotalPages(res.totalPages);
      setPage(res.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách vé của bạn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (tab === 'CONFIRMED') return order.isConfirmed();
    if (tab === 'PENDING') return order.isPending();
    if (tab === 'CANCELLED') return order.isCancelled();
    return true;
  });

  const confirmedCount = orders.filter((o) => o.isConfirmed()).length;
  const pendingCount = orders.filter((o) => o.isPending()).length;
  const cancelledCount = orders.filter((o) => o.isCancelled()).length;

  return (
    <CustomerPageContainer className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        title="Vé xe của tôi"
        description="Quản lý vé xe khách đã đặt, xem mã QR điện tử lên xe và lịch sử giao dịch"
        actions={
          <Link
            to="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs font-bold glow-coral-sm transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm chuyến xe mới</span>
          </Link>
        }
      />

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTab('ALL')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            tab === 'ALL'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Tất cả đơn ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('CONFIRMED')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            tab === 'CONFIRMED'
              ? 'bg-[#FF385C] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Đã phát vé ({confirmedCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('PENDING')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            tab === 'PENDING'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Chờ thanh toán ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('CANCELLED')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            tab === 'CANCELLED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Đã hủy ({cancelledCount})
        </button>
      </div>

      {/* Main Content List */}
      {loading ? (
        <LoadingState count={3} />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách đơn vé"
          error={error}
          onRetry={() => fetchOrders(page)}
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={
            tab === 'CONFIRMED'
              ? 'Chưa có vé xe nào được phát hành'
              : tab === 'PENDING'
              ? 'Không có đơn nào đang chờ thanh toán'
              : tab === 'CANCELLED'
              ? 'Không có đơn nào đã bị hủy'
              : 'Bạn chưa có đơn đặt vé nào'
          }
          description="Khám phá ngay các tuyến đường chất lượng cao và đặt vé xe trực tuyến để bắt đầu hành trình."
          action={
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs font-bold glow-coral-sm transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm chuyến xe ngay</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isConfirmed = order.isConfirmed();
            const isPending = order.isPending();

            return (
              <div
                key={order.orderId}
                className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-2xs hover:border-[#FF385C]/30 hover:shadow-sm transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} size="sm" />
                    <MoneyText amount={order.totalAmount.toString()} size="sm" variant="coral" />
                  </div>
                </div>

                {/* Ticket Items Overview */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={item.itemId || idx}
                      className="p-3.5 bg-[#FAF9F6] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md bg-[#FFF0F2] text-[#FF385C] tabular-nums">
                          Ghế {item.transportSeatCode}
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {item.passengerName}
                        </span>
                        {item.listingTitle && (
                          <span className="text-xs text-gray-500 font-medium truncate max-w-xs">
                            · {item.listingTitle}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {item.transportDepartureAt && (
                          <span className="tabular-nums">
                            {new Date(item.transportDepartureAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        <MoneyText amount={item.transportFareVnd.toString()} size="xs" variant="ink" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {order.items.length} vé hành khách
                  </span>

                  <div className="flex items-center gap-2.5 justify-end">
                    {isPending ? (
                      <Link
                        to={`/checkout/${order.orderId}`}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs font-bold glow-coral-sm transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Thanh toán ngay</span>
                      </Link>
                    ) : isConfirmed ? (
                      <Link
                        to={`/account/orders/${order.orderId}`}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#111827] hover:bg-[#FF385C] text-white text-xs font-bold transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Xem vé QR</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/account/orders/${order.orderId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => fetchOrders(p)}
                disabled={loading}
              />
            </div>
          )}
        </div>
      )}
    </CustomerPageContainer>
  );
};
