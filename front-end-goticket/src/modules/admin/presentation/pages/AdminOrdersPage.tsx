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
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className="text-left w-full focus:outline-none"
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
          className="text-left w-full focus:outline-none"
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
          className="text-left w-full focus:outline-none"
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
          className="text-left w-full focus:outline-none"
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
          className={`flex items-center justify-between rounded-2xl p-4 text-xs sm:text-sm border ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 text-xs"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Search & Status Filter Toolbar */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-canvas rounded-xl border border-line">
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-coral text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn, email, họ tên..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:ring-1 focus:ring-coral focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-muted hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Orders List / Table */}
      <SurfaceCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-bold text-base text-ink">
            Danh sách đơn hàng ({filteredOrders.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12">
            <LoadingState message="Đang tải danh sách đơn hàng..." />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 text-xs">
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không tìm thấy đơn hàng"
              description={
                searchTerm
                  ? `Không có đơn hàng nào khớp với từ khóa "${searchTerm}".`
                  : 'Chưa có đơn hàng nào thuộc trạng thái này.'
              }
              action={
                searchTerm ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
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
                <thead className="border-b border-line bg-canvas/70 font-semibold text-muted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Mã đơn hàng</th>
                    <th className="px-5 py-3.5">Khách hàng</th>
                    <th className="px-5 py-3.5">Ngày đặt</th>
                    <th className="px-5 py-3.5 text-right">Tổng thanh toán</th>
                    <th className="px-5 py-3.5 text-center">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-coral-soft/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-ink block text-xs">
                            {order.orderNumber}
                          </span>
                          <IdText id={order.orderId} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-ink block text-xs">
                          {order.customerName}
                        </span>
                        <span className="text-muted text-[11px] block">
                          {order.customerEmail || 'Không có email'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted/80" />
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
                            className="h-8 px-2 text-xs text-coral hover:bg-coral-soft gap-1"
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
                              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
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
            <div className="block lg:hidden divide-y divide-line/60">
              {filteredOrders.map((order) => (
                <div key={order.orderId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-ink text-sm block">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-muted block">{order.customerName}</span>
                    </div>
                    <StatusBadge status={order.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <MoneyText amount={order.totalAmount} variant="coral" size="sm" />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/40">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-coral hover:bg-coral-soft gap-1"
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
                        className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
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
        <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-coral">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Chi tiết Đơn hàng #{selectedOrder?.orderNumber}</span>
            </div>
            <DialogTitle className="text-lg font-serif font-bold text-ink">
              Thông tin Đơn vé Vận tải
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Dữ liệu lưu vết tại hệ thống thanh toán và điều hành GoTicket
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-3 py-2 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3">
                <span className="font-semibold text-ink">Trạng thái</span>
                <StatusBadge status={selectedOrder.status} size="sm" />
              </div>

              <div className="space-y-2 divide-y divide-line/60 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-muted">Mã định danh ID</span>
                  <IdText id={selectedOrder.orderId} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted">Khách hàng</span>
                  <span className="font-semibold text-ink">{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted">Email</span>
                  <span className="font-medium text-ink">{selectedOrder.customerEmail || 'Chưa cung cấp'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted">Ngày tạo</span>
                  <span className="text-ink">
                    {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-ink">Tổng giá trị</span>
                  <MoneyText amount={selectedOrder.totalAmount} variant="coral" size="base" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrder(null)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
