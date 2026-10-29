import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, RefreshCw, Search, Ticket, Wallet } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { vietnamDate } from '@/shared/utils/vietnam-date';
import { formatVnd } from '@/shared/domain/money.vo';
import { useAuth } from '@/modules/auth/presentation/context/AuthContext';
import { PageHeader, SurfaceCard, InlineAlert, LoadingState, EmptyState, Button, Pagination, StatusBadge } from '@/shared/presentation/components';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type SalesRow = { cashier_id: string; order_count: number; ticket_count: number; issued_count: number; cancelled_count: number; received_amount: number; topup_amount: number; refund_amount: number; net_amount: number; last_sale_at: string };
type OrderRow = { order_id: string; order_number: string; receipt_no: string; customer_name: string; status: string; ticket_count: number; cancelled_count: number; amount: number; topup_amount: number; refund_amount: number; net_amount: number; received_at: string };
type Page<T> = { rows: T[]; summary?: Partial<SalesRow>; totalElements: number; totalPages: number };
type Person = { fullName?: string; username?: string; email?: string };
const input = 'min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[var(--gt-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--gt-brand)]/20';
const when = (date: string) => new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export const OperatorCounterSalesPage: React.FC = () => {
  const { user } = useAuth();
  const [from, setFrom] = useState(() => vietnamDate());
  const [to, setTo] = useState(() => vietnamDate());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(() => ({ from: vietnamDate(), to: vietnamDate(), cashierId: '' }));
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Page<SalesRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState('');
  const [people, setPeople] = useState<Record<string, Person>>({});
  const names = useRef<Record<string, Person>>({});
  const [selected, setSelected] = useState<SalesRow | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [details, setDetails] = useState<Page<OrderRow> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void httpClient.get<Page<SalesRow>>('/api/v1/orders/transport/vendor/counter-sales', { params: { ...filter, cashierId: filter.cashierId || undefined, page: page - 1, size: 20 } }).then(async result => {
      if (!active) return;
      setData(result);
      await Promise.all(result.rows.map(async row => {
        if (names.current[row.cashier_id]) return;
        if (row.cashier_id === user?.id) { names.current[row.cashier_id] = { fullName: user.fullName }; return; }
        try { names.current[row.cashier_id] = await httpClient.get<Person>('/api/v1/operators/me/staff/lookup', { params: { query: row.cashier_id } }); }
        catch { /* Keep an explicit account ID if Identity cannot resolve a historical cashier. */ }
      }));
      if (active) setPeople({ ...names.current });
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được doanh số nhân viên.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, page, refresh, user?.id]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setDetailLoading(true); setDetailError(''); setDetails(null);
    void httpClient.get<Page<OrderRow>>(`/api/v1/orders/transport/vendor/counter-sales/${selected.cashier_id}`, { params: { from: filter.from, to: filter.to, page: detailPage - 1, size: 20 } })
      .then(result => { if (active) setDetails(result); })
      .catch(reason => { if (active) setDetailError(reason instanceof Error ? reason.message : 'Không tải được các đơn đã thu tiền.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selected, detailPage, filter]);

  const apply = async (event: React.FormEvent) => {
    event.preventDefault(); if (lookingUp) return;
    if (!from || !to || from > to) { setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return; }
    setLookingUp(true); setError('');
    try {
      let cashierId = '';
      if (search.trim()) {
        const person = await httpClient.get<Person & { id: string }>('/api/v1/operators/me/staff/lookup', { params: { query: search.trim() } });
        if (!person.id) throw new Error('Không tìm thấy tài khoản nhân viên. Hãy nhập đúng tài khoản, email hoặc số điện thoại.');
        cashierId = person.id; names.current[cashierId] = person;
      }
      setPage(1); setFilter({ from, to, cashierId }); setRefresh(x => x + 1); setSelected(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tìm thấy nhân viên.'); }
    finally { setLookingUp(false); }
  };
  const name = (id: string) => people[id]?.fullName || people[id]?.username || people[id]?.email || `Tài khoản ${id.slice(0, 8)}`;
  const totals = data?.summary || {};
  return <div className="space-y-6">
    <PageHeader title="Bán vé theo nhân viên" description="Theo dõi vé đã thu tiền tại quầy, doanh số và các khoản điều chỉnh của từng người bán." actions={<Button variant="outline" disabled={loading} onClick={() => setRefresh(x => x + 1)}><RefreshCw size={16} className="mr-2" />Tải lại</Button>} />
    <SurfaceCard variant="flat">
      <form onSubmit={apply} className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,auto)_minmax(150px,auto)_minmax(200px,1fr)_auto]">
        <label className="min-w-0 space-y-2 text-sm font-semibold"><span className="block">Từ ngày thu tiền</span><input aria-label="Từ ngày thu tiền" type="date" required value={from} max={to} onChange={e => setFrom(e.target.value)} className={`${input} w-full min-w-0`} /></label>
        <label className="min-w-0 space-y-2 text-sm font-semibold"><span className="block">Đến ngày</span><input aria-label="Đến ngày thu tiền" type="date" required value={to} min={from} onChange={e => setTo(e.target.value)} className={`${input} w-full min-w-0`} /></label>
        <label className="min-w-0 space-y-2 text-sm font-semibold sm:col-span-2 xl:col-span-1"><span className="block">Nhân viên</span><input aria-label="Tìm nhân viên bán vé" placeholder="Tài khoản, email hoặc số điện thoại" value={search} onChange={e => setSearch(e.target.value)} className={`${input} w-full min-w-0`} /></label>
        <Button type="submit" disabled={loading || lookingUp} className="min-h-11 bg-[var(--gt-brand)] text-white hover:bg-[var(--gt-brand-hover)]"><Search size={16} className="mr-2" />{lookingUp ? 'Đang tìm...' : 'Xem báo cáo'}</Button>
      </form>
      <p className="mt-4 text-sm text-gray-600">Tính các đơn đã nhận tiền trong khoảng ngày đã chọn, theo giờ Việt Nam. Đơn mới giữ chỗ hoặc chưa thu tiền không tính vào doanh số.</p>
    </SurfaceCard>
    {error && <InlineAlert variant="error" title="Chưa tải được số liệu" message={error} onClose={() => setError('')} />}
    {loading ? <LoadingState message="Đang tổng hợp doanh số nhân viên..." /> : !error && <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SurfaceCard variant="flat"><p className="flex items-center gap-2 text-sm text-gray-600"><Ticket size={17} />Vé đã thu tiền</p><p className="mt-2 text-2xl font-bold tabular-nums">{Number(totals.ticket_count || 0).toLocaleString('vi-VN')}</p><p className="mt-2 text-sm text-gray-600">{Number(totals.order_count || 0)} đơn · {Number(totals.cancelled_count || 0)} vé đã hủy</p></SurfaceCard>
        <SurfaceCard variant="flat"><p className="flex items-center gap-2 text-sm text-gray-600"><Wallet size={17} />Tiền thu ban đầu</p><p className="mt-2 text-xl font-bold tabular-nums">{formatVnd(Number(totals.received_amount || 0))}</p><p className="mt-2 text-sm text-gray-600">Thu thêm: {formatVnd(Number(totals.topup_amount || 0))}</p></SurfaceCard>
        <SurfaceCard variant="flat"><p className="text-sm text-gray-600">Doanh số sau điều chỉnh</p><p className="mt-2 text-xl font-bold tabular-nums">{formatVnd(Number(totals.net_amount || 0))}</p><p className="mt-2 text-sm text-gray-600">Đã hoàn: {formatVnd(Number(totals.refund_amount || 0))}</p></SurfaceCard>
      </div>
      <SurfaceCard variant="flat" className="p-0 sm:p-0">
        <div className="border-b border-gray-100 p-5"><h2 className="text-lg font-bold">Nhân viên bán vé ({data?.totalElements || 0})</h2><p className="mt-2 text-sm text-gray-600">Khoản thu thêm và hoàn đã xác nhận của các đơn này được cập nhật đến hiện tại, quy về người bán ban đầu. Đây là doanh số bán vé, không phải xác nhận nhân viên đã nộp tiền.</p></div>
        {!data?.rows.length ? <EmptyState icon={Users} title="Chưa có vé đã thu tiền" description="Chọn khoảng ngày khác hoặc xóa bộ lọc nhân viên để xem thêm." /> : <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr>{['Nhân viên', 'Đơn', 'Vé đã thu', 'Vé đã hủy', 'Thu ban đầu', 'Thu thêm', 'Đã hoàn', 'Sau điều chỉnh', 'Gần nhất', 'Chi tiết'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{data.rows.map(row => <tr key={row.cashier_id} className="border-t border-gray-100">
          <td className="px-4 py-4"><strong>{name(row.cashier_id)}</strong>{people[row.cashier_id]?.username && <p className="mt-1 text-xs text-gray-500">{people[row.cashier_id].username}</p>}</td>
          <td className="px-4 py-4 tabular-nums">{row.order_count}</td><td className="px-4 py-4 tabular-nums">{row.ticket_count}{Number(row.issued_count) < Number(row.ticket_count) && <p className="text-xs text-amber-800">{Number(row.ticket_count) - Number(row.issued_count)} chờ phát hành</p>}</td><td className="px-4 py-4 tabular-nums">{row.cancelled_count}</td>
          {[row.received_amount, row.topup_amount, row.refund_amount, row.net_amount].map((v, i) => <td key={i} className="whitespace-nowrap px-4 py-4 tabular-nums">{formatVnd(Number(v))}</td>)}<td className="px-4 py-4 text-xs">{when(row.last_sale_at)}</td>
          <td className="px-4 py-4"><Button variant="outline" aria-label={`Xem đơn của ${name(row.cashier_id)}`} onClick={() => { setSelected(row); setDetailPage(1); }}>Xem đơn</Button></td>
        </tr>)}</tbody></table></div>}
        <div className="p-4"><Pagination currentPage={page} totalPages={data?.totalPages || 1} totalItems={data?.totalElements} disabled={loading} onPageChange={setPage} /></div>
      </SurfaceCard>
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>Đơn đã thu tiền · {selected ? name(selected.cashier_id) : ''}</DialogTitle><DialogDescription>Ngày thu tiền từ {filter.from} đến {filter.to}. Các đơn mới nhất hiển thị trước.</DialogDescription></DialogHeader>
      {detailError && <InlineAlert variant="error" title="Không tải được đơn" message={detailError} />}
      {detailLoading ? <LoadingState message="Đang tải đơn của nhân viên..." /> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr>{['Đơn / khách', 'Thời điểm thu', 'Vé', 'Thu ban đầu', 'Thu thêm', 'Đã hoàn', 'Trạng thái'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{details?.rows.map(row => <tr key={row.order_id} className="border-t border-gray-100"><td className="p-3"><Link className="font-semibold text-[var(--gt-brand-ink)] underline" to={`/operator/orders?search=${encodeURIComponent(row.order_number)}`}>{row.order_number}</Link><p className="mt-1 text-xs text-gray-600">{row.customer_name}</p></td><td className="p-3 text-xs">{when(row.received_at)}</td><td className="p-3">{row.ticket_count}</td>{[row.amount, row.topup_amount, row.refund_amount].map((v, i) => <td key={i} className="whitespace-nowrap p-3">{formatVnd(Number(v))}</td>)}<td className="p-3"><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div>}
      <Pagination currentPage={detailPage} totalPages={details?.totalPages || 1} disabled={detailLoading} onPageChange={setDetailPage} />
    </DialogContent></Dialog>
  </div>;
};
