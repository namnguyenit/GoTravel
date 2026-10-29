import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Search, MessageSquare, FlaskConical, ChevronRight } from 'lucide-react';
import { AutomaticRefundButton } from '../components/AutomaticRefundButton';
import { refundReasonLabel } from '@/modules/booking/domain/refund-reasons';
import { AdminStatusBadge as StatusBadge } from './AdminStatusBadge';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { PageHeader, SurfaceCard, MoneyText, Button, EmptyState, LoadingState, Pagination, DateTimeText } from '@/shared/presentation/components';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { AdminPage } from './AdminOrdersPage';

type Tab = 'refunds' | 'claims';
type Category = 'PENDING' | 'COMPLETED' | 'REVIEW';
interface Claim {
  disputeId: string; orderId: string; orderNumber?: string; customerName?: string;
  customerEmail?: string; reason: string; description?: string; status: string;
  orderStatus?: string; adminNote?: string; createdAt: string;
}
interface RefundCase {
  id: string; source: 'ITEM' | 'ORDER'; orderId: string; orderNumber: string;
  customerName?: string; customerEmail?: string; paymentMethod: string;
  category: Category; operationKind: string; operationState: string; routeTitle?: string; seatCode?: string;
  amount: string; reasonCode?: string; reasonText?: string; detail?: string;
  reference?: string; evidenceUrl?: string; simulated: boolean; createdAt: string;
}
type Action = { kind: 'claim'; claim: Claim; value: string; title: string } | { kind: 'proof'; refund: RefundCase; title: string } | { kind: 'review'; refund: RefundCase; title: string };
const base = '/api/v1/orders/transport/admin';
const categories: [Category, string][] = [['PENDING', 'Chờ xử lý'], ['COMPLETED', 'Đã hoàn'], ['REVIEW', 'Cần rà soát']];
const positive = (value: string) => /^\d+(?:\.0+)?$/.test(value) && BigInt(value.replace(/\.0+$/, '')) > 0n;
const field = 'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[var(--gt-brand)] focus:ring-2 focus:ring-[var(--gt-brand)]/15';
const reason = (row: RefundCase) => row.reasonText || (row.reasonCode ? refundReasonLabel(row.reasonCode) : row.operationKind === 'ORDER' ? 'Hủy đơn vé' : row.operationKind === 'CANCEL' ? 'Hủy vé' : 'Hoàn chênh lệch đổi vé');

export const AdminRefundsPage = () => {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'claims' ? 'claims' : 'refunds';
  const category: Category = params.get('category') === 'COMPLETED' ? 'COMPLETED' : params.get('category') === 'REVIEW' ? 'REVIEW' : 'PENDING';
  const search = params.get('search') || '';
  const history = params.get('history') === 'true';
  const [input, setInput] = useState(search);
  const [page, setPage] = useState(1);
  const [refunds, setRefunds] = useState<RefundCase[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [evidence, setEvidence] = useState('');
  const [dialogError, setDialogError] = useState('');
  const request = useRef(0);
  const locked = useRef(false);
  useEffect(() => { setInput(search); setPage(1); setNotice(''); }, [search, tab, category, history]);
  const navigate = (changes: Record<string, string>) => {
    setPage(1);
    setParams(current => { const next = new URLSearchParams(current); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); return next; });
  };
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError('');
    try {
      if (tab === 'claims') {
        const data = await httpClient.get<AdminPage<Claim>>(`${base}/disputes`, { params: { active: !history, search, page: page - 1, size: 15 }, cache: 'no-store' });
        if (current !== request.current) return;
        if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
        setClaims(data.content); setTotal(data.totalElements); setPages(data.totalPages);
      } else {
        const data = await httpClient.get<AdminPage<RefundCase>>(`${base}/refund-queue`, { params: { category, search, page: page - 1, size: 15 }, cache: 'no-store' });
        if (current !== request.current) return;
        if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
        setRefunds(data.content); setTotal(data.totalElements); setPages(data.totalPages);
      }
    } catch (failure) { if (current === request.current) setError(failure instanceof Error ? failure.message : 'Chưa tải được hồ sơ. Hãy thử tải lại.'); }
    finally { if (current === request.current) setLoading(false); }
  }, [tab, history, category, search, page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const completed = (message: string) => { setNotice(message); void load(); };
  const open = (value: Action) => { setAction(value); setNote(value.kind === 'claim' ? value.claim.adminNote || '' : ''); setReference(''); setEvidence(''); setDialogError(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!action || locked.current) return;
    if (action.kind === 'claim' && !note.trim()) { setDialogError('Nhập nội dung phản hồi cho khách hàng.'); return; }
    if (action.kind === 'proof' && (!reference.trim() || !/^https:\/\/[^\s]+$/.test(evidence.trim()))) { setDialogError('Nhập mã giao dịch và đường dẫn HTTPS của chứng từ đã hoàn.'); return; }
    locked.current = true; setBusy(true); setDialogError('');
    try {
      if (action.kind === 'claim') await httpClient.put(`${base}/disputes/${action.claim.disputeId}/resolve`, { action: action.value, adminNote: note.trim() });
      else if (action.kind === 'review') await httpClient.put(`${base}/refunds/${action.refund.orderId}/open-paid-review`, {});
      else {
        const row = action.refund;
        const proof = { amount: row.amount, reference: reference.trim(), evidenceUrl: evidence.trim() };
        if (row.source === 'ORDER') await httpClient.put(`${base}/refunds/${row.id}/complete`, proof);
        else await httpClient.post(`${base}/item-operations/${row.id}/refund`, { ...proof, refundMethod: 'BANK_TRANSFER', cashShiftId: null });
      }
      const message = action.kind === 'claim' ? 'Đã lưu phản hồi cho khách hàng.' : action.kind === 'review' ? 'Đã mở khoản hoàn. Xem tại nhóm Chờ xử lý.' : 'Đã ghi nhận chứng từ hoàn tiền.';
      setAction(null); completed(message);
    } catch (failure) { setDialogError(failure instanceof Error ? failure.message : 'Chưa lưu được. Kiểm tra lại thông tin và thử lại.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const orderLink = (id: string, label?: string) => <Link className="font-semibold text-[var(--gt-brand-ink)] underline decoration-[var(--gt-brand-ink)]/30 underline-offset-4 hover:decoration-current break-all" to={`/admin/orders?search=${encodeURIComponent(id)}`}>{label || id}</Link>;
  const changeTab = (value: Tab) => navigate({ tab: value, category: '', history: '', search: '' });
  return <div className="space-y-5">
    <PageHeader variant="portal" title="Khiếu nại & Hoàn tiền" description="Xử lý khoản hoàn theo vé hoặc toàn đơn; tiếp nhận và phản hồi yêu cầu của khách." actions={<Button variant="outline" className="rounded-full" disabled={loading || busy} onClick={() => void load()}><RefreshCw aria-hidden="true" className={loading ? 'animate-spin' : ''} />Tải lại</Button>} />
    <div className="flex gap-5 border-b border-stone-200" aria-label="Nhóm hồ sơ">
      {([['refunds', 'Hoàn tiền'], ['claims', 'Khiếu nại']] as const).map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? 'page' : undefined} onClick={() => changeTab(value)} className={`min-h-12 border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gt-brand)] ${tab === value ? 'border-[var(--gt-brand)] text-[var(--gt-brand-ink)]' : 'border-transparent text-stone-600 hover:text-stone-900'}`}>{label}</button>)}
    </div>
    {tab === 'refunds' && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950"><FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Chế độ demo: VNPAY sandbox và thanh toán mô phỏng được hoàn trong ứng dụng. Không chuyển tiền ngân hàng.</p>}
    <SurfaceCard className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {tab === 'refunds' ? <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 xl:flex" aria-label="Trạng thái khoản hoàn">{categories.map(([value, label]) => <button key={value} type="button" aria-pressed={category === value} onClick={() => navigate({ category: value })} className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--gt-brand)] ${category === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>{label}</button>)}</div> : <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700"><input type="checkbox" className="size-4 accent-[var(--gt-brand)]" checked={history} onChange={event => navigate({ history: event.target.checked ? 'true' : '' })} />Hiện cả phiếu đã đóng</label>}
        <form className="flex w-full gap-2 xl:max-w-md" onSubmit={event => { event.preventDefault(); navigate({ search: input.trim() }); }}>
          <input aria-label="Tìm hồ sơ theo mã đơn, mã hồ sơ, tên hoặc email" maxLength={120} className={field} value={input} onChange={event => setInput(event.target.value)} placeholder="Mã đơn, tên hoặc email khách…" />
          <Button aria-label="Tìm kiếm hồ sơ" className="h-11 shrink-0 rounded-xl bg-[#111827] text-white hover:bg-[#374151]" type="submit"><Search aria-hidden="true" /><span className="hidden sm:inline">Tìm</span></Button>
        </form>
      </div>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-700"><p>{error}</p><Button variant="outline" onClick={() => void load()}>Thử lại</Button></div> : loading ? <LoadingState /> : <>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600"><span>{total} {tab === 'claims' ? 'phiếu hỗ trợ' : 'khoản hoàn / hồ sơ'}{search ? ` · Từ khóa: ${search}` : ''}</span><span>Mới nhất trước</span></div>
        {total === 0 && <EmptyState title={tab === 'claims' ? 'Không có phiếu hỗ trợ' : category === 'COMPLETED' ? 'Chưa có khoản hoàn trong nhóm này' : 'Không có hồ sơ cần xử lý'} description={search ? 'Thử từ khóa khác hoặc bỏ bộ lọc tìm kiếm.' : tab === 'claims' ? 'Phiếu chỉ xuất hiện khi khách gửi yêu cầu hỗ trợ.' : 'Các khoản hoàn phát sinh từ hủy vé, đổi vé hoặc hủy chuyến sẽ xuất hiện tại đây.'} />}
        <div className="divide-y divide-stone-200">
          {tab === 'refunds' && refunds.map(row => <article key={`${row.source}-${row.id}`} className="space-y-3 py-5 first:pt-0">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2">{orderLink(row.orderId, row.orderNumber)}<span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{row.source === 'ORDER' ? 'Toàn đơn' : row.operationState.startsWith('ABORT') ? 'Khoản thu thêm' : row.operationKind === 'CANCEL' ? 'Hủy vé' : 'Đổi vé'}</span></div><p className="text-sm text-stone-800">{row.customerName || 'Khách hàng'}{row.customerEmail && <span className="break-all text-stone-600"> · {row.customerEmail}</span>}</p><p className="text-xs text-stone-600"><DateTimeText value={row.createdAt} /></p></div>
              <div className="shrink-0 space-y-1 sm:text-right"><p className="text-xs text-stone-600">{category === 'COMPLETED' ? 'Đã hoàn' : category === 'REVIEW' ? 'Số tiền đã xác định' : 'Số tiền phải hoàn'}</p><MoneyText amount={row.amount} className="text-lg font-bold" />{row.simulated && <span className="block text-xs font-medium text-amber-800">Đã hoàn mô phỏng</span>}</div>
            </div>
            {row.routeTitle && <p className="text-sm text-stone-700">{row.routeTitle}{row.seatCode ? ` · Ghế ${row.seatCode}` : ''}</p>}
            <p className="whitespace-pre-wrap break-words text-sm text-stone-700">{reason(row)}</p>
            {category === 'REVIEW' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{row.detail || 'Hồ sơ chưa đủ điều kiện xác nhận hoàn. Kiểm tra chi tiết đơn và nguồn thu trước khi xử lý.'}</p>}
            {row.reference && <p className="break-all text-xs text-stone-600">Mã ghi nhận: {row.reference}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {category === 'PENDING' && positive(row.amount) && <>
                {row.paymentMethod === 'ONLINE' && <AutomaticRefundButton operationId={row.id} source={row.source} amount={row.amount} onCompleted={completed} />}
                <details className="w-full"><summary className="w-fit cursor-pointer py-2 text-xs text-stone-600 underline underline-offset-4 focus-visible:outline-2">Đã hoàn bên ngoài ứng dụng?</summary><div className="flex flex-wrap items-center gap-3 py-2"><p className="max-w-xl text-xs text-stone-600">Chỉ ghi nhận khi đã trả tiền thực tế và có chứng từ. Không dùng đồng thời với hoàn qua cổng.</p><Button size="sm" variant="outline" disabled={busy} onClick={() => open({ kind: 'proof', refund: row, title: 'Ghi nhận khoản đã hoàn thực tế' })}>Nhập chứng từ đã hoàn</Button></div></details>
              </>}
              {category === 'REVIEW' && row.source === 'ORDER' && row.operationState === 'PAID_REVIEW' && <Button size="sm" disabled={busy} onClick={() => open({ kind: 'review', refund: row, title: 'Kiểm tra và mở khoản hoàn' })}>Kiểm tra điều kiện hoàn</Button>}
              {category === 'REVIEW' && <Link className="inline-flex min-h-10 items-center gap-1 text-sm text-[var(--gt-brand-ink)] underline underline-offset-4" to={`/admin/reconciliation?search=${encodeURIComponent(row.orderId)}`}>Xem đối soát<ChevronRight aria-hidden="true" className="size-4" /></Link>}
            </div>
          </article>)}
          {tab === 'claims' && claims.map(claim => <article key={claim.disputeId} className="space-y-3 py-5 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1">{orderLink(claim.orderId, claim.orderNumber)}<p className="text-sm text-stone-800">{claim.customerName || 'Khách hàng'}{claim.customerEmail && <span className="break-all text-stone-600"> · {claim.customerEmail}</span>}</p><p className="text-xs text-stone-600"><DateTimeText value={claim.createdAt} /></p></div><StatusBadge status={claim.status} /></div>
            <h2 className="text-sm font-semibold text-stone-900">{claim.reason}</h2>
            {claim.description && <p className="whitespace-pre-wrap break-words text-sm text-stone-700">{claim.description}</p>}
            {claim.adminNote && <p className="whitespace-pre-wrap break-words rounded-xl bg-stone-100 p-3 text-sm text-stone-700"><strong>Phản hồi: </strong>{claim.adminNote}</p>}
            <div className="flex flex-wrap gap-2">
              {['OPEN', 'IN_REVIEW'].includes(claim.status) && <Button size="sm" className="min-h-10 rounded-full bg-[var(--gt-brand-ink)] px-4 text-white hover:bg-[var(--gt-brand-ink)]" onClick={() => open({ kind: 'claim', claim, value: claim.status === 'OPEN' ? 'IN_REVIEW' : 'RESOLVE', title: 'Phản hồi yêu cầu hỗ trợ' })}><MessageSquare aria-hidden="true" />Phản hồi / Xử lý</Button>}
              <Button size="sm" variant="ghost" className="min-h-10" onClick={() => navigate({ tab: 'refunds', search: claim.orderId, category: claim.orderStatus === 'REFUNDED' ? 'COMPLETED' : 'PENDING', history: '' })}>Xem khoản hoàn của đơn<ChevronRight aria-hidden="true" /></Button>
            </div>
          </article>)}
        </div>
        <Pagination currentPage={page} totalPages={pages} totalItems={total} onPageChange={setPage} disabled={busy || loading} />
      </>}
    </SurfaceCard>
    <Dialog open={Boolean(action)} onOpenChange={value => { if (!value && !locked.current) setAction(null); }}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{action?.title}</DialogTitle><DialogDescription>{action?.kind === 'claim' ? 'Phản hồi được lưu trên phiếu của khách. Đóng phiếu không tự hủy vé hoặc thực hiện hoàn tiền.' : action?.kind === 'proof' ? 'Lưu chứng từ của khoản đã trả thực tế. Thao tác này không chuyển tiền ngân hàng.' : 'Hệ thống đối chiếu khoản thu và tình trạng giữ chỗ. Chỉ mở hoàn khi xác nhận không phát được vé.'}</DialogDescription></DialogHeader>
        <form onSubmit={event => void submit(event)} className="space-y-4">
          {action?.kind === 'claim' && <>
            <label className="block space-y-2 text-sm"><span>Hướng xử lý</span><select className={field} value={action.value} onChange={event => setAction({ ...action, value: event.target.value })} disabled={busy}><option value="IN_REVIEW">Đang xem xét / Phản hồi khách</option><option value="RESOLVE">Đã giải quyết</option><option value="REJECT">Từ chối yêu cầu</option></select></label>
            <label className="block space-y-2 text-sm"><span>Nội dung phản hồi <span className="text-red-700">*</span></span><textarea className={`${field} min-h-32 resize-y`} required maxLength={2000} value={note} onChange={event => setNote(event.target.value)} disabled={busy} placeholder="Nêu kết quả kiểm tra và hướng hỗ trợ khách hàng…" /></label>
          </>}
          {action?.kind === 'proof' && <><p>Số tiền đã hoàn: <MoneyText amount={action.refund.amount} /></p><label className="block space-y-2 text-sm"><span>Mã giao dịch / Biên nhận *</span><input className={field} required maxLength={160} value={reference} onChange={event => setReference(event.target.value)} disabled={busy} /></label><label className="block space-y-2 text-sm"><span>Đường dẫn chứng từ HTTPS *</span><input className={field} required type="url" maxLength={1000} value={evidence} onChange={event => setEvidence(event.target.value)} disabled={busy} placeholder="https://…" /></label></>}
          {dialogError && <p role="alert" className="text-sm text-red-700">{dialogError}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" disabled={busy} onClick={() => setAction(null)}>Đóng</Button><Button type="submit" className="bg-[var(--gt-brand-ink)] text-white hover:bg-[var(--gt-brand-ink)]" disabled={busy}>{busy ? 'Đang lưu…' : action?.kind === 'claim' ? 'Lưu phản hồi' : action?.kind === 'proof' ? 'Xác nhận đã hoàn' : 'Kiểm tra và mở hoàn'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
};
