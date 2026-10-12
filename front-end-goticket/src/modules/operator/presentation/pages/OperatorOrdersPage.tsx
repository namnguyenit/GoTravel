import React, { useEffect, useState } from 'react';
import { bookingService } from '@/modules/booking/composition';
import type { OrderEntity } from '@/modules/booking/domain/entity/order.entity';
import { DateVo } from '@/shared/domain/date.vo';
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  MoneyText,
  IdText,
  Pagination,
  InlineAlert,
  LoadingState,
  EmptyState,
  Button,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  Eye,
  User,
  Phone,
  Mail,
  Ticket,
  MapPin,
  Calendar,
} from 'lucide-react';

export const OperatorOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const limit = 10;

  // Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Detail Modal State
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<OrderEntity | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const fetchVendorOrders = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingService.getVendorOrders(targetPage, limit, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery,
      });
      setOrders(res.orders);
      setTotalPages(res.totalPages);
      setTotalOrders(res.total);
      setPage(res.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn vé của nhà xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorOrders(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendorOrders(1);
  };

  const handleOpenDetail = async (orderId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await bookingService.getVendorOrderDetail(orderId);
      setSelectedDetailOrder(detail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý đơn đặt vé"
        eyebrow="Kênh Nhà Xe"
        description="Theo dõi toàn bộ đơn đặt vé trực tuyến và vé đặt tại quầy thuộc các chuyến xe do nhà xe điều hành."
        actions={
          <div className="rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-4 py-2 text-xs font-semibold text-gray-500 shadow-2xs">
            Tổng số đơn: <strong className="text-gray-900 font-bold">{totalOrders}</strong>
          </div>
        }
      />

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi tải dữ liệu"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <SurfaceCard variant="glass" className="p-4 sm:p-5 rounded-[28px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`
                px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs
                ${
                  statusFilter === st
                    ? 'bg-[#FF385C] text-white shadow-md glow-coral-sm'
                    : 'bg-white/90 text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200/80'
                }
              `}
            >
              {st === 'ALL'
                ? 'Tất cả'
                : st === 'CONFIRMED'
                ? 'Đã xác nhận'
                : st === 'PENDING'
                ? 'Đang chờ'
                : 'Đã hủy'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc SĐT..."
              className="pl-10 pr-4 py-2 text-xs bg-white/90 border border-gray-200/80 rounded-full w-64 focus:outline-none focus:border-[#FF385C] text-gray-900 font-medium shadow-2xs"
            />
          </div>
          <Button
            type="submit"
            className="bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-full px-5 shadow-2xs"
          >
            Tìm
          </Button>
        </form>
      </SurfaceCard>

      {/* Main Table */}
      <SurfaceCard variant="glass" className="overflow-hidden p-0 rounded-[28px] border border-white/80 shadow-glass">
        {loading ? (
          <div className="p-8">
            <LoadingState message="Đang tải danh sách đơn vé..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FileText}
              title="Không tìm thấy đơn vé nào"
              description="Chưa có đơn vé nào khớp với tiêu chí tìm kiếm hoặc trạng thái đang lọc."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-900">
              <thead className="bg-white/60 backdrop-blur-md text-gray-500 font-bold border-b border-gray-100/80">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Mã đơn</th>
                  <th className="py-3.5 px-4 font-semibold">Thời gian tạo</th>
                  <th className="py-3.5 px-4 font-semibold">Khách hàng</th>
                  <th className="py-3.5 px-4 font-semibold">Số vé & Ghế</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Tổng tiền</th>
                  <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {orders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-white/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <IdText id={order.orderNumber || order.orderId} />
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {DateVo.formatVietnamDateTime(order.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold">{order.customerInfo.fullName || 'Khách vãng lai'}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{order.customerInfo.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-coral-soft text-[10px] font-bold text-[#FF385C] border border-[#FF385C]/20 shadow-2xs">
                              Ghế {item.transportSeatCode}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <span className="text-[11px] text-gray-400 font-medium">
                            +{order.items.length - 2} ghế khác
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText
                        amount={order.totalAmount.toNumber()}
                        weight="extrabold"
                        variant="ink"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={
                          order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                            ? 'CONFIRMED'
                            : order.status === 'PENDING'
                            ? 'PENDING'
                            : 'CANCELLED'
                        }
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(order.orderId)}
                        className="inline-flex h-8 items-center gap-1 rounded-full border border-gray-200/80 bg-white/90 px-3.5 text-xs font-semibold text-gray-700 hover:border-[#FF385C] hover:text-[#FF385C] shadow-2xs transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FF385C]" />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100/80">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => fetchVendorOrders(p)}
            />
          </div>
        )}
      </SurfaceCard>

      {/* Vendor Order Detail Dialog */}
      <Dialog
        open={Boolean(selectedDetailOrder)}
        onOpenChange={(open) => !open && setSelectedDetailOrder(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border-white/80 bg-white/95 backdrop-blur-xl p-6 shadow-glass-lg">
          {selectedDetailOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
                  <span>Chi tiết đơn vé nhà xe</span>
                  <StatusBadge
                    status={
                      selectedDetailOrder.status === 'CONFIRMED' ||
                      selectedDetailOrder.status === 'COMPLETED'
                        ? 'CONFIRMED'
                        : selectedDetailOrder.status === 'PENDING'
                        ? 'PENDING'
                        : 'CANCELLED'
                    }
                  />
                </DialogTitle>
                <DialogDescription>
                  <IdText
                    id={String(selectedDetailOrder.orderNumber || selectedDetailOrder.orderId || '')}
                    prefix="Mã đơn"
                  />
                </DialogDescription>
              </DialogHeader>

              {/* Customer & General info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/70 backdrop-blur-md rounded-2xl text-xs border border-white/80 shadow-2xs my-2">
                <div className="space-y-1.5">
                  <span className="text-gray-500 font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#FF385C]" />
                    Hành khách liên hệ:
                  </span>
                  <strong className="text-sm font-bold text-gray-900 block">
                    {selectedDetailOrder.customerInfo.fullName || 'Khách vãng lai'}
                  </strong>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-3 h-3" />
                    <span>{selectedDetailOrder.customerInfo.phone || 'Chưa có SĐT'}</span>
                  </div>
                  {selectedDetailOrder.customerInfo.email && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Mail className="w-3 h-3" />
                      <span>{selectedDetailOrder.customerInfo.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <span className="text-gray-500 block font-semibold">Thời gian tạo:</span>
                  <div className="font-semibold text-gray-900">
                    {DateVo.formatVietnamDateTime(selectedDetailOrder.createdAt)}
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] text-gray-400 block font-bold uppercase tracking-wider">Tổng tiền đơn:</span>
                    <MoneyText
                      amount={selectedDetailOrder.totalAmount.toNumber()}
                      size="lg"
                      weight="extrabold"
                      variant="coral"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket items table */}
              <div className="space-y-2 mt-3">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-[#FF385C]" />
                  Danh sách vé & ghế ({selectedDetailOrder.items.length})
                </h4>

                <div className="rounded-2xl border border-white/80 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/60 backdrop-blur-md text-gray-500 font-semibold border-b border-gray-100/80">
                      <tr>
                        <th className="py-2.5 px-3">Ghế</th>
                        <th className="py-2.5 px-3">Hành khách</th>
                        <th className="py-2.5 px-3">Chuyến xe</th>
                        <th className="py-2.5 px-3 text-right">Giá vé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80">
                      {selectedDetailOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#FF385C]">
                            {item.transportSeatCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-gray-900">{item.passengerName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-gray-500">
                            <div>{item.listingTitle || 'Tuyến xe cố định'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <MoneyText amount={item.transportFareVnd.toNumber()} size="sm" weight="bold" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
