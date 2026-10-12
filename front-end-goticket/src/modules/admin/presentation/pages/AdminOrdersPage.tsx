import React, { useEffect, useState, useMemo } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  MetricCard,
  SurfaceCard,
  StatusBadge,
  MoneyText,
  IdText,
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingState,
} from '@/shared/presentation/components';
import {
  ShoppingBag,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Eye,
  User,
  Calendar,
  Clock,
  X,
  CreditCard,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface AdminOrderSummary {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  rawData?: any;
}

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Force cancel modal
  const [orderToCancel, setOrderToCancel] = useState<AdminOrderSummary | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderSummary | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await httpClient.get<any>('/api/v1/orders/admin', {
        params: { orderKind: 'GOCAR_TICKET', limit: 50 },
      });
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.content)
        ? res.content
        : Array.isArray(res)
        ? res
        : [];

      const formatted = list.map((item: any) => ({
        orderId: item.orderId || item.id,
        orderNumber: item.orderNumber || item.orderId || item.id,
        customerName: item.customerInfo?.fullName || item.fullName || 'Khách hàng',
        customerEmail: item.customerInfo?.email || item.email || '',
        totalAmount: String(item.totalAmount || 0),
        status: item.status || 'PENDING',
        createdAt: item.createdAt || new Date().toISOString(),
        rawData: item,
      }));

      setOrders(formatted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        order.orderNumber.toLowerCase().includes(term) ||
        order.orderId.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerEmail.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  const kpis = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'COMPLETED').length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    return { total, confirmed, pending, cancelled };
  }, [orders]);

  const handleConfirmForceCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await httpClient.put<any>(`/api/v1/orders/admin/${orderToCancel.orderId}/force-cancel`);
      setFeedback({
        type: 'success',
        message: `Đã cưỡng chế hủy đơn hàng #${orderToCancel.orderNumber} thành công.`,
      });
      setOrderToCancel(null);
      await fetchOrders();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Cưỡng chế hủy thất bại.',
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title="Quản trị Đơn hàng Toàn hệ thống"
        eyebrow="Kiểm soát Giao dịch & Cưỡng chế"
        description="Theo dõi toàn bộ đơn đặt vé trên GoTicket, kiểm soát trạng thái giao dịch và thực hiện can thiệp cưỡng chế khi có sự cố."
        breadcrumbs={[
          { label: 'Admin GoTicket', to: '/admin' },
          { label: 'Đơn hàng' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-full border-white/80 bg-white/80 backdrop-blur-md shadow-xs gap-2 px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
        >
          <MetricCard
            label="Tổng đơn tải"
            value={kpis.total}
            subtext="Đơn vé vận tải gần đây"
            icon={ShoppingBag}
            variant={statusFilter === 'ALL' ? 'coral' : 'default'}
          />
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CONFIRMED')}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
        >
          <MetricCard
            label="Đã xác nhận"
            value={kpis.confirmed}
            subtext="Đã thanh toán thành công"
            icon={CheckCircle2}
            variant={statusFilter === 'CONFIRMED' ? 'emerald' : 'default'}
          />
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
        >
          <MetricCard
            label="Chờ thanh toán"
            value={kpis.pending}
            subtext="Đang giữ chỗ hoặc chờ gateway"
            icon={Clock}
            variant={statusFilter === 'PENDING' ? 'coral' : 'default'}
          />
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CANCELLED')}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
        >
          <MetricCard
            label="Đã hủy"
            value={kpis.cancelled}
            subtext="Hết hạn giữ chỗ hoặc hủy bỏ"
            icon={Ban}
            variant={statusFilter === 'CANCELLED' ? 'coral' : 'default'}
          />
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-[24px] p-4 text-xs sm:text-sm border backdrop-blur-md shadow-xs ${
            feedback.type === 'success'
              ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-800'
              : 'border-rose-200/80 bg-rose-50/80 text-rose-800'
          }`}
        >
          <span className="font-medium">{feedback.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 text-xs rounded-full"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Search & Status Filter Toolbar */}
      <SurfaceCard className="p-4 sm:p-5 rounded-[28px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/60 backdrop-blur-sm rounded-full border border-white/80 shadow-xs">
            {[
              { key: 'ALL', label: `Tất cả (${kpis.total})` },
              { key: 'CONFIRMED', label: `Đã xác nhận (${kpis.confirmed})` },
              { key: 'PENDING', label: `Chờ thanh toán (${kpis.pending})` },
              { key: 'CANCELLED', label: `Đã hủy (${kpis.cancelled})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                  statusFilter === tab.key
                    ? 'bg-[#FF385C] text-white shadow-coral-sm'
                    : 'text-[var(--gt-muted)] hover:text-[var(--gt-ink)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-[var(--gt-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn, email, họ tên..."
              className="w-full h-10 pl-10 pr-8 text-xs bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-coral)] focus:ring-4 focus:ring-[var(--gt-coral)]/10 focus:outline-none transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-[var(--gt-muted)] hover:text-[var(--gt-ink)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Orders List / Table */}
      <SurfaceCard className="p-0 overflow-hidden rounded-[32px]">
        <div className="p-5 sm:p-6 border-b border-[var(--gt-border)]/60 flex items-center justify-between">
          <h2 className="font-black text-base text-[var(--gt-ink)]">
            Danh sách đơn hàng ({filteredOrders.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-14">
            <LoadingState message="Đang tải danh sách đơn hàng..." />
          </div>
        ) : error ? (
          <div className="p-14 text-center text-rose-600 text-xs font-semibold">
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-14">
            <EmptyState
              title="Không tìm thấy đơn hàng"
              description={
                searchTerm
                  ? `Không có đơn hàng nào khớp với từ khóa "${searchTerm}".`
                  : 'Chưa có đơn hàng nào thuộc trạng thái này.'
              }
              action={
                searchTerm ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm('')} className="rounded-full text-xs">
                    Xóa tìm kiếm
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--gt-border)]/60 bg-white/50 backdrop-blur-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-4">Mã đơn hàng</th>
                    <th className="px-5 py-4">Khách hàng</th>
                    <th className="px-5 py-4">Ngày đặt</th>
                    <th className="px-5 py-4 text-right">Tổng thanh toán</th>
                    <th className="px-5 py-4 text-center">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-white/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-[var(--gt-ink)] block text-xs">
                            {order.orderNumber}
                          </span>
                          <IdText id={order.orderId} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-[var(--gt-ink)] block text-xs">
                          {order.customerName}
                        </span>
                        <span className="text-[var(--gt-muted)] text-[11px] block">
                          {order.customerEmail || 'Không có email'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[var(--gt-muted)] font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[var(--gt-muted)]/80" />
                          <span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <MoneyText amount={order.totalAmount} variant="ink" size="sm" />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs text-[var(--gt-coral)] hover:bg-[var(--gt-coral-soft)] rounded-full gap-1 font-semibold"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </Button>

                          {order.status !== 'CANCELLED' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-3 font-bold shadow-xs"
                              onClick={() => setOrderToCancel(order)}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              <span>Cưỡng chế hủy</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="block lg:hidden divide-y divide-white/60">
              {filteredOrders.map((order) => (
                <div key={order.orderId} className="p-4 sm:p-5 space-y-3 hover:bg-white/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-[var(--gt-ink)] text-sm block">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-[var(--gt-muted)] block">{order.customerName}</span>
                    </div>
                    <StatusBadge status={order.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 font-medium">
                    <span className="text-[var(--gt-muted)]">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <MoneyText amount={order.totalAmount} variant="coral" size="sm" />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[var(--gt-border)]/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-[var(--gt-coral)] hover:bg-[var(--gt-coral-soft)] rounded-full gap-1 font-semibold"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </Button>

                    {order.status !== 'CANCELLED' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-3 font-bold shadow-xs"
                        onClick={() => setOrderToCancel(order)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        <span>Cưỡng chế hủy</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SurfaceCard>

      {/* Force Cancel Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(orderToCancel)}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
        title="Cưỡng chế hủy đơn hàng?"
        description={`Bạn đang thực hiện thao tác can thiệp quản trị: CƯỠNG CHẾ HỦY đơn hàng #${orderToCancel?.orderNumber} (ID: ${orderToCancel?.orderId}). Các vé liên quan sẽ bị hủy bỏ và giải phóng ghế ngay lập tức.`}
        confirmLabel="Xác nhận Cưỡng chế Hủy"
        variant="danger"
        onConfirm={handleConfirmForceCancel}
        loading={cancelling}
      />

      {/* Order Detail Modal */}
      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-[32px] border-2 border-white/80 bg-white/95 backdrop-blur-2xl shadow-glass-xl text-[var(--gt-ink)]">
          <DialogHeader className="space-y-1.5 text-left border-b border-[var(--gt-border)]/60 pb-3.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--gt-coral)] uppercase tracking-wider">
              <ShoppingBag className="h-4 w-4" />
              <span>Đơn hàng #{selectedOrder?.orderNumber}</span>
            </div>
            <DialogTitle className="text-xl font-black text-[var(--gt-ink)] tracking-tight">
              Thông tin Đơn vé Vận tải
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--gt-muted)]">
              Dữ liệu lưu vết tại hệ thống thanh toán và điều hành GoTicket
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-xs">
                <span className="font-bold text-[var(--gt-ink)]">Trạng thái</span>
                <StatusBadge status={selectedOrder.status} size="sm" />
              </div>

              <div className="space-y-2.5 divide-y divide-[var(--gt-border)]/50 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm p-4 shadow-xs">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[var(--gt-muted)] font-medium">Mã định danh ID</span>
                  <IdText id={selectedOrder.orderId} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[var(--gt-muted)] font-medium">Khách hàng</span>
                  <span className="font-bold text-[var(--gt-ink)]">{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[var(--gt-muted)] font-medium">Email</span>
                  <span className="font-medium text-[var(--gt-ink)]">{selectedOrder.customerEmail || 'Chưa cung cấp'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[var(--gt-muted)] font-medium">Ngày tạo</span>
                  <span className="text-[var(--gt-ink)] font-semibold">
                    {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-black text-[var(--gt-ink)] text-sm">Tổng giá trị</span>
                  <MoneyText amount={selectedOrder.totalAmount} variant="coral" size="base" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end pt-3 border-t border-[var(--gt-border)]/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrder(null)}
              className="rounded-full px-5 text-xs font-semibold"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
