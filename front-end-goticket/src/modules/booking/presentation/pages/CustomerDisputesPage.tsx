import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { DateVo } from '@/shared/domain/date.vo';
import { supportStatusLabels } from '@/shared/utils/support-status';
import { CustomerPageContainer, PageHeader, SurfaceCard, StatusBadge, InlineAlert, EmptyState, LoadingState, Pagination, Button } from '@/shared/presentation/components';
import { ArrowLeft, MessageSquareWarning } from 'lucide-react';

type Page<T> = { content: T[]; totalElements: number; totalPages: number };
type OrderChoice = { orderId?: string; id?: string; orderNumber?: string; status: string; items?: { transportTicketId?: string; listingTitle?: string }[] };
type Dispute = { disputeId: string; orderId: string; orderNumber?: string; reason: string; description?: string; status: string; adminNote?: string; createdAt: string };
const eligible = (order: OrderChoice) => ['CONFIRMED', 'COMPLETED', 'PAID_REVIEW', 'REFUND_PENDING', 'REFUNDED', 'CANCELLATION_PENDING', 'FULFILLMENT_PENDING', 'CASH_RECEIVED_PENDING_RECONCILIATION'].includes(order.status)
  || (order.status === 'CANCELLED' && Boolean(order.items?.some(item => item.transportTicketId)));

export const CustomerDisputesPage: React.FC = () => {
  const [params] = useSearchParams();
  const [items, setItems] = useState<Dispute[]>([]);
  const [orders, setOrders] = useState<OrderChoice[]>([]);
  const [selected, setSelected] = useState<OrderChoice | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [orderInput, setOrderInput] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const sequence = useRef(0);
  const lock = useRef(false);
  const orderId = selected?.orderId || selected?.id || '';

  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setListError('');
    try {
      const data = await httpClient.get<Page<Dispute>>('/api/v1/orders/disputes', { params: { page: page - 1, size: 10, orderKind: 'GOCAR_TICKET', search, status } });
      if (current !== sequence.current) return;
      if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
      setItems(data.content); setTotal(data.totalElements); setPages(data.totalPages);
    } catch (error) { if (current === sequence.current) setListError(error instanceof Error ? error.message : 'Không tải được lịch sử yêu cầu.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [page, search, status]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    setOrdersLoading(true); setOrderError('');
    void httpClient.get<Page<OrderChoice>>('/api/v1/orders', { signal: controller.signal, params: { page: orderPage - 1, size: 10, orderKind: 'GOCAR_TICKET', search: orderSearch,
      statuses: 'CONFIRMED,COMPLETED,PAID_REVIEW,REFUND_PENDING,REFUNDED,CANCELLATION_PENDING,FULFILLMENT_PENDING,CASH_RECEIVED_PENDING_RECONCILIATION,CANCELLED' } })
      .then(data => { if (!controller.signal.aborted) { setOrders(data.content); setOrderPages(data.totalPages); } })
      .catch(error => { if (!controller.signal.aborted) setOrderError(error instanceof Error ? error.message : 'Không tải được đơn vé.'); })
      .finally(() => { if (!controller.signal.aborted) setOrdersLoading(false); });
    return () => controller.abort();
  }, [orderPage, orderSearch]);

  const requestedOrder = params.get('orderId');
  useEffect(() => {
    if (!requestedOrder) return;
    const controller = new AbortController();
    void httpClient.get<OrderChoice & { orderKind: string }>(`/api/v1/orders/${encodeURIComponent(requestedOrder)}`, { signal: controller.signal })
      .then(order => {
        if (controller.signal.aborted) return;
        if (order.orderKind !== 'GOCAR_TICKET' || !eligible(order)) { setFormError('Đơn vé chưa đủ điều kiện gửi yêu cầu hỗ trợ.'); return; }
        setSelected(order);
      }).catch(error => { if (!controller.signal.aborted) setFormError(error instanceof Error ? error.message : 'Không tải được đơn vé đã chọn.'); });
    return () => controller.abort();
  }, [requestedOrder]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || !selected || !eligible(selected) || !reason.trim()) return;
    lock.current = true; setSubmitting(true); setFormError(''); setSuccess('');
    try {
      await httpClient.post('/api/v1/orders/disputes', { orderId, reason: reason.trim(), description: description.trim() || undefined });
      setReason(''); setDescription('');
      setSuccess('Đã gửi yêu cầu. Bạn có thể xem phản hồi của quản trị viên trong lịch sử bên dưới.');
      setSearch(''); setSearchInput(''); setStatus(''); setPage(1);
      await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Không gửi được yêu cầu. Vui lòng thử lại.'); }
    finally { lock.current = false; setSubmitting(false); }
  };

  return <CustomerPageContainer className="space-y-6 py-8">
    <Link to="/account/tickets" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Vé của tôi</Link>
    <PageHeader title="Khiếu nại & Hỗ trợ đơn vé" description="Chọn đơn vé để gửi yêu cầu. Đội ngũ GoTicket sẽ phản hồi tại đây; gửi khiếu nại không tự động hủy vé hoặc hoàn tiền." />
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <SurfaceCard className="space-y-5 p-6">
        <h2 className="text-base font-bold">Tạo yêu cầu hỗ trợ</h2>
        <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setOrderPage(1); setOrderSearch(orderInput.trim()); }}>
          <label className="flex-1 min-w-48 text-sm">Tìm đơn vé của bạn
            <input value={orderInput} maxLength={120} onChange={event => setOrderInput(event.target.value)} placeholder="Mã đơn hoặc tên chuyến" className="mt-2 min-h-11 w-full rounded-xl border p-3 text-base" />
          </label>
          <Button type="submit" className="self-end" disabled={ordersLoading}>Tìm đơn</Button>
        </form>
        {orderError && <InlineAlert variant="error" title="Không tải được đơn vé" message={orderError} />}
        <label className="block space-y-2 text-sm"><span>Đơn vé cần hỗ trợ</span>
          <select disabled={ordersLoading || submitting} value={orderId} onChange={event => {
            setSelected(orders.find(order => (order.orderId || order.id) === event.target.value) || null); setFormError(''); setSuccess('');
          }} className="min-h-11 w-full rounded-xl border bg-white p-3 text-base">
            <option value="">{ordersLoading ? 'Đang tải đơn vé…' : 'Chọn đơn vé'}</option>
            {selected && !orders.some(order => (order.orderId || order.id) === orderId) && <option value={orderId}>{selected.orderNumber || orderId}</option>}
            {orders.map(order => <option key={order.orderId || order.id} value={order.orderId || order.id} disabled={!eligible(order)}>{order.orderNumber || order.orderId || order.id} · {order.items?.[0]?.listingTitle || 'Vé xe'}{!eligible(order) ? ' · Chưa đủ điều kiện' : ''}</option>)}
          </select>
        </label>
        <Pagination currentPage={orderPage} totalPages={orderPages} onPageChange={setOrderPage} disabled={ordersLoading || submitting} />
        {!ordersLoading && !orderError && !orders.length && <p className="text-sm text-muted">Không có đơn phù hợp. Bạn cũng có thể mở chi tiết vé rồi chọn “Gửi yêu cầu hỗ trợ”.</p>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2 text-sm"><span>Vấn đề cần hỗ trợ</span><input required maxLength={255} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: Chưa nhận tiền hoàn vé" className="min-h-11 w-full rounded-xl border p-3 text-base" /></label>
          <label className="block space-y-2 text-sm"><span>Mô tả chi tiết</span><textarea maxLength={2000} rows={5} value={description} onChange={event => setDescription(event.target.value)} className="w-full rounded-xl border p-3 text-base" /></label>
          {formError && <InlineAlert variant="error" title="Chưa gửi được yêu cầu" message={formError} />}
          {success && <InlineAlert variant="success" title="Đã gửi" message={success} />}
          <Button type="submit" disabled={submitting || !orderId || !reason.trim()}>{submitting ? 'Đang gửi…' : 'Gửi yêu cầu hỗ trợ'}</Button>
        </form>
      </SurfaceCard>
      <section className="space-y-4">
        <h2 className="text-base font-bold">Lịch sử yêu cầu ({total})</h2>
        <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="flex flex-wrap gap-2">
          <input aria-label="Tìm yêu cầu hỗ trợ" maxLength={120} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Mã đơn hoặc nội dung yêu cầu" className="min-h-11 min-w-48 flex-1 rounded-xl border p-3 text-base" />
          <Button type="submit">Tìm kiếm</Button>
          <select aria-label="Trạng thái yêu cầu" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border bg-white p-3 text-base">
            <option value="">Tất cả trạng thái</option><option value="OPEN">Mới gửi</option><option value="IN_REVIEW">Đang xem xét</option><option value="RESOLVED">Đã giải quyết</option><option value="REJECTED">Đã từ chối</option><option value="REFUNDED">Đã hoàn tiền</option>
          </select>
          <Button variant="outline" type="button" onClick={() => void load()} disabled={loading}>Tải lại</Button>
        </form>
        <p className="text-sm text-muted">Yêu cầu mới nhất được hiển thị trước.</p>
        {listError ? <><InlineAlert variant="error" title="Không tải được lịch sử" message={listError} /><Button onClick={() => void load()}>Thử lại</Button></> : loading ? <LoadingState /> : !items.length ? <EmptyState icon={MessageSquareWarning} title="Không có yêu cầu phù hợp" description="Thay đổi bộ lọc hoặc gửi yêu cầu mới cho đơn vé của bạn." /> : items.map(item => <SurfaceCard key={item.disputeId} className="space-y-3 p-5">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{item.reason}</h3><StatusBadge status={item.status} label={supportStatusLabels[item.status]} /></div>
          <Link to={`/account/orders/${item.orderId}`} className="text-sm underline">Đơn {item.orderNumber || item.orderId}</Link>
          <p className="whitespace-pre-wrap break-words text-sm">{item.description}</p>
          {item.adminNote && <div className="rounded-xl bg-stone-50 p-4 text-sm"><strong>Phản hồi từ GoTicket</strong><p className="mt-2 whitespace-pre-wrap break-words">{item.adminNote}</p></div>}
          <p className="text-sm text-muted">Gửi lúc {DateVo.formatVietnamDateTime(item.createdAt)}</p>
        </SurfaceCard>)}
        <Pagination currentPage={page} totalPages={pages} totalItems={total} onPageChange={setPage} disabled={loading} />
      </section>
    </div>
  </CustomerPageContainer>;
};
