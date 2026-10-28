import { AutomaticRefundButton } from '../components/AutomaticRefundButton';
import { AdminStatusBadge as StatusBadge } from './AdminStatusBadge';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  MetricCard,
  SurfaceCard,
  MoneyText,
  IdText,
  Button,
  EmptyState,
  LoadingState,
  Pagination,
  DateTimeText,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
} from 'lucide-react';

export interface TransportAdminOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  totalAmount: string;
  transportRefundDue?: string;
  transportPendingItemRefundDue?: string;
  transportPendingItemRefundCount?: number;
  transportPendingItemRefundOperationId?: string;
  transportCancellationReason?: string;
  customerInfo?: { fullName?: string; email?: string; phone?: string };
  createdAt: string;
  expiresAt?: string;
  items?: {
    itemId: string;
    listingTitle?: string;
    transportTripId?: string;
    transportSeatCode?: string;
    transportTicketId?: string;
    transportItemState?: string;
    passengerName?: string;
    totalPrice: string;
  }[];
}
export interface AdminPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}
const groups = [
  ['ATTENTION', 'Cần xử lý'],
  ['ALL', 'Tất cả đơn vé'],
  ['UNPAID', 'Chờ thanh toán'],
  ['PROCESSING', 'Đang đồng bộ'],
  ['ISSUED', 'Đã xác nhận / Hoàn tất'],
  ['CANCELLED', 'Đã hủy'],
  ['REFUNDED', 'Đã hoàn tiền'],
] as const;
export const AdminOrdersPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('ATTENTION');
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const [search, setSearch] = useState(params.get('search') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPage<TransportAdminOrder>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
  });
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<TransportAdminOrder | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError('');
    try {
      const [orders, counts] = await Promise.all([
        httpClient.get<AdminPage<TransportAdminOrder>>(
          '/api/v1/orders/transport/admin/orders',
          {
            params: {
              view: search ? 'ALL' : view,
              search,
              page: page - 1,
              size: 20,
            },
          },
        ),
        httpClient.get<Record<string, number>>(
          '/api/v1/orders/transport/admin/summary',
        ),
      ]);
      if (request.current !== current) return;
      if (orders.totalPages > 0 && page > orders.totalPages) {
        setPage(orders.totalPages);
        return;
      }
      setData(orders);
      setTotals(counts);
    } catch (e) {
      if (request.current === current)
        setError(e instanceof Error ? e.message : 'Không tải được đơn vé.');
    } finally {
      if (request.current === current) setLoading(false);
    }
  }, [page, view, search]);
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, [load]);
  useEffect(() => {
    const term = params.get('search') || '';
    setSearch(term);
    setSearchInput(term);
    setPage(1);
  }, [params]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn vé GoTicket"
        eyebrow="Quản trị đơn vé"
        description="Mỗi lần đặt vé là một đơn, không phải một chuyến xe. Mặc định chỉ hiện đơn cần can thiệp; đơn chờ thanh toán và lịch sử hết hạn nằm ở các nhóm riêng."
        actions={
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tải lại
          </Button>
        }
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Tổng đơn vé"
          value={loading || error ? '—' : (totals.ALL ?? 0)}
          icon={ShoppingBag}
          subtext="Chỉ GoTicket, gồm cả lịch sử"
        />
        <MetricCard
          label="Cần xử lý"
          value={loading || error ? '—' : (totals.ATTENTION ?? 0)}
          icon={AlertTriangle}
          variant="coral"
          subtext="Rà soát tiền, hoàn tiền, đồng bộ quá 5 phút"
        />
        <MetricCard
          label="Đã xác nhận / Hoàn tất"
          value={loading || error ? '—' : (totals.ISSUED ?? 0)}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Chờ thanh toán"
          value={loading || error ? '—' : (totals.UNPAID ?? 0)}
          icon={Clock}
          subtext="Không phải yêu cầu admin duyệt"
        />
      </div>
      <SurfaceCard className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Nhóm đơn vé">
          {groups.map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={!search && view === key ? 'default' : 'outline'}
              onClick={() => {
                setView(key);
                setSearch('');
                setSearchInput('');
                setParams({});
                setPage(1);
              }}
            >
              {label} ({totals[key] ?? '—'})
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams(searchInput.trim() ? { search: searchInput.trim() } : {});
            setPage(1);
          }}
        >
          <input
            aria-label="Tìm đơn vé"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={120}
            placeholder="Mã đơn, tên hoặc email khách hàng…"
            className="w-full rounded-xl border px-4 py-2 text-sm"
          />
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />
            Tìm
          </Button>
        </form>
        {search && (
          <p className="text-sm text-stone-600">
            Đang tìm “{search}” trong toàn bộ lịch sử đơn GoTicket.
          </p>
        )}
        {error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : loading ? (
          <LoadingState />
        ) : data.content.length === 0 ? (
          <EmptyState
            title={
              view === 'ATTENTION' && !search
                ? 'Không có đơn vé cần can thiệp'
                : 'Không tìm thấy đơn vé'
            }
            description="Các đơn đặt vé bình thường vẫn được lưu trong nhóm Tất cả đơn vé."
          />
        ) : (
          <>
            <p className="text-xs text-stone-500">
              {data.totalElements} đơn thuộc bộ lọc này
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-stone-500">
                    <th className="py-3">Đơn / Ngày đặt</th>
                    <th>Khách hàng</th>
                    <th>Số tiền đơn</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((o) => (
                    <tr key={o.orderId} className="border-b last:border-0">
                      <td className="py-4">
                        <strong>{o.orderNumber || o.orderId}</strong>
                        <div className="text-xs text-stone-500">
                          <DateTimeText value={o.createdAt} />
                        </div>
                      </td>
                      <td>
                        {o.customerInfo?.fullName || 'Khách hàng'}
                        <div className="text-xs text-stone-500">
                          {o.customerInfo?.email}
                        </div>
                      </td>
                      <td>
                        <MoneyText amount={o.totalAmount} />
                        <div className="text-xs text-stone-500">
                          {o.paymentMethod === 'CASH'
                            ? 'Tiền mặt'
                            : 'Trực tuyến'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(o)}
                        >
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              totalItems={data.totalElements}
              onPageChange={setPage}
              disabled={loading}
            />
          </>
        )}
      </SurfaceCard>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Đơn vé {selected?.orderNumber}</DialogTitle>
            <DialogDescription>
              Thông tin đơn và các vé liên quan. Hủy chuyến, hoàn tiền được xử
              lý tại đúng phân hệ nghiệp vụ.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <IdText id={selected.orderId} />
              <StatusBadge status={selected.status} />
              <p>
                {selected.customerInfo?.fullName} ·{' '}
                {selected.customerInfo?.email} · {selected.customerInfo?.phone}
              </p>
              <p>
                Tổng giá trị đơn: <MoneyText amount={selected.totalAmount} />
              </p>
              {Number(selected.transportRefundDue) > 0 && (
                <p>
                  Nghĩa vụ hoàn toàn đơn:{' '}
                  <MoneyText amount={selected.transportRefundDue} />
                </p>
              )}
              {Number(selected.transportPendingItemRefundDue) > 0 && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p>Hoàn từng vé đang chờ ({selected.transportPendingItemRefundCount} yêu cầu): <MoneyText amount={selected.transportPendingItemRefundDue || '0'} /></p>
                {selected.transportPendingItemRefundOperationId && <AutomaticRefundButton operationId={selected.transportPendingItemRefundOperationId} amount={selected.transportPendingItemRefundDue || '0'} onCompleted={() => { setSelected(null); void load(); }} />}
              </div>}
              {selected.transportCancellationReason && (
                <p>Lý do hủy: {selected.transportCancellationReason}</p>
              )}
              {selected.items?.map((i) => (
                <div key={i.itemId} className="border rounded-xl p-3 space-y-1">
                  <strong>{i.listingTitle || 'Vé xe khách'}</strong>
                  <p>
                    {i.passengerName || 'Hành khách'} · Ghế{' '}
                    {i.transportSeatCode || '—'}
                  </p>
                  {i.transportTripId && (
                    <p>
                      Chuyến: <IdText id={i.transportTripId} />
                    </p>
                  )}
                  <StatusBadge
                    status={
                      i.transportItemState ||
                      (i.transportTicketId ? 'CONFIRMED' : 'PAYMENT_PENDING')
                    }
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to={`/admin/refunds?tab=refunds&search=${encodeURIComponent(selected.orderId)}`}>Hoàn tiền toàn đơn / Rà soát</Link>
                </Button>
                <Button asChild variant="outline"><Link to={`/admin/refunds?tab=operations&search=${encodeURIComponent(selected.orderId)}`}>Hoàn tiền từng vé / Chênh lệch đổi vé</Link></Button>
                <Button asChild variant="outline"><Link to={`/admin/refunds?tab=claims&search=${encodeURIComponent(selected.orderId)}`}>Phiếu khách gửi hỗ trợ</Link></Button>
                <Button asChild variant="outline">
                  <Link to="/admin/reconciliation">Đối soát sự cố</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
