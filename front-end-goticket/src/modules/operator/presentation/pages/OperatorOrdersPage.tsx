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
          <div className="rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--gt-muted)]">
            Tổng số đơn: <strong className="text-[var(--gt-ink)]">{totalOrders}</strong>
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
      <SurfaceCard className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`
                px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all
                ${
                  statusFilter === st
                    ? 'bg-[#FF385C] text-white shadow-xs'
                    : 'bg-[var(--gt-canvas)] text-[var(--gt-muted)] hover:text-[var(--gt-ink)]'
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gt-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc SĐT..."
              className="pl-9 pr-3 py-2 text-xs bg-[var(--gt-canvas)] border border-[var(--gt-border)] rounded-2xl w-64 focus:outline-none focus:border-[var(--gt-coral)] text-[var(--gt-ink)] font-medium"
            />
          </div>
          <Button
            type="submit"
            className="bg-[var(--gt-ink)] hover:bg-black text-white text-xs font-bold rounded-2xl px-4"
          >
            Tìm
          </Button>
        </form>
      </SurfaceCard>

      {/* Main Table */}
      <SurfaceCard className="overflow-hidden p-0">
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
            <table className="w-full text-left text-xs text-[var(--gt-ink)]">
              <thead className="bg-[var(--gt-canvas)] text-[var(--gt-muted)] font-bold border-b border-[var(--gt-border)]">
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
              <tbody className="divide-y divide-[var(--gt-border)]">
                {orders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <IdText id={order.orderNumber || order.orderId} />
                    </td>
                    <td className="py-3.5 px-4 text-[var(--gt-muted)]">
                      {DateVo.formatVietnamDateTime(order.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold">{order.customerInfo.fullName || 'Khách vãng lai'}</div>
                      <div className="text-[11px] text-[var(--gt-muted)]">{order.customerInfo.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-[var(--gt-coral-soft)] text-[10px] font-bold text-[var(--gt-coral)]">
                              Ghế {item.transportSeatCode}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <span className="text-[11px] text-[var(--gt-muted)]">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(order.orderId)}
                        className="h-8 text-xs font-semibold rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-[var(--gt-coral)]" />
                        <span>Chi tiết</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--gt-border)]">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDetailOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[var(--gt-ink)] flex items-center justify-between">
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
                    id={selectedDetailOrder.orderNumber || selectedDetailOrder.orderId}
                    prefix="Mã đơn"
                  />
                </DialogDescription>
              </DialogHeader>

              {/* Customer & General info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[var(--gt-canvas)] rounded-2xl text-xs border border-[var(--gt-border)] my-2">
                <div className="space-y-1.5">
                  <span className="text-[var(--gt-muted)] font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[var(--gt-coral)]" />
                    Hành khách liên hệ:
                  </span>
                  <strong className="text-sm font-bold text-[var(--gt-ink)] block">
                    {selectedDetailOrder.customerInfo.fullName || 'Khách vãng lai'}
                  </strong>
                  <div className="flex items-center gap-2 text-[var(--gt-muted)]">
                    <Phone className="w-3 h-3" />
                    <span>{selectedDetailOrder.customerInfo.phone || 'Chưa có SĐT'}</span>
                  </div>
                  {selectedDetailOrder.customerInfo.email && (
                    <div className="flex items-center gap-2 text-[var(--gt-muted)]">
                      <Mail className="w-3 h-3" />
                      <span>{selectedDetailOrder.customerInfo.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <span className="text-[var(--gt-muted)] block font-semibold">Thời gian tạo:</span>
                  <div className="font-semibold text-[var(--gt-ink)]">
                    {DateVo.formatVietnamDateTime(selectedDetailOrder.createdAt)}
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] text-[var(--gt-muted)] block">Tổng tiền đơn:</span>
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
                <h4 className="text-xs font-bold text-[var(--gt-ink)] flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-[var(--gt-coral)]" />
                  Danh sách vé & ghế ({selectedDetailOrder.items.length})
                </h4>

                <div className="rounded-2xl border border-[var(--gt-border)] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--gt-canvas)] text-[var(--gt-muted)] font-semibold border-b border-[var(--gt-border)]">
                      <tr>
                        <th className="py-2.5 px-3">Ghế</th>
                        <th className="py-2.5 px-3">Hành khách</th>
                        <th className="py-2.5 px-3">Chuyến xe</th>
                        <th className="py-2.5 px-3 text-right">Giá vé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--gt-border)]">
                      {selectedDetailOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[var(--gt-coral)]">
                            {item.transportSeatCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold">{item.passengerName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-[var(--gt-muted)]">
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
