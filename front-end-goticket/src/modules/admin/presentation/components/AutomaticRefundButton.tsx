import { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { Button, MoneyText } from '@/shared/presentation/components';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type RefundInfo = { operationId: string; state: string; eligible: boolean; amount: string | number; provider?: string; message: string; reference?: string; environment?: string; simulated?: boolean; simulationEligible?: boolean };
const integer = (value: string | number) => typeof value === 'number' && !Number.isSafeInteger(value) ? '' : String(value).replace(/\.0+$/, '');
export function AutomaticRefundButton({ operationId, amount, source = 'ITEM', disabled, onCompleted }: {
  operationId: string; amount: string; source?: 'ITEM' | 'ORDER'; disabled?: boolean; onCompleted?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<RefundInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const completed = useRef(false);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  const endpoint = source === 'ORDER' ? `/api/v1/orders/transport/admin/refunds/${operationId}/simulation` : `/api/v1/orders/transport/admin/item-operations/${operationId}/automatic-refund`;
  const accept = useCallback((data: RefundInfo) => {
    setInfo(data);
    if (data.state === 'COMPLETED' && !completed.current) {
      completed.current = true; setOpen(false);
      onCompleted?.(data.message);
    }
  }, [onCompleted]);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setError('');
    try { const data = await httpClient.get<RefundInfo>(endpoint, { cache: 'no-store' }); if (current === sequence.current) accept(data); }
    catch (reason) { if (current === sequence.current) setError(reason instanceof Error ? reason.message : 'Chưa kiểm tra được khoản hoàn. Hãy thử lại.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [endpoint, accept]);
  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  useEffect(() => {
    if (!open) return;
    completed.current = false; setInfo(null);
    void refreshRef.current();
    return () => { sequence.current++; };
  }, [open, endpoint]);
  useEffect(() => {
    if (!open || !info || !['PENDING', 'SUCCEEDED', 'REQUESTED'].includes(info.state)) return;
    const timer = window.setInterval(() => { if (!inFlight.current) void refreshRef.current(); }, 5000);
    return () => window.clearInterval(timer);
  }, [open, info?.state]);
  const mock = source === 'ITEM' && info?.provider === 'MOCK' && info.eligible;
  const canSimulate = Boolean(info?.simulationEligible || mock);
  const mismatch = Boolean(info && canSimulate && integer(info.amount) !== integer(amount));
  const confirm = async () => {
    if (!info || !canSimulate || inFlight.current || mismatch) return;
    inFlight.current = true; setSending(true); setError(''); sequence.current++;
    try { accept(await httpClient.post<RefundInfo>(mock ? endpoint : `${endpoint}/simulate`, { amount: integer(amount) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa nhận kết quả. Bấm kiểm tra trạng thái trước khi thử lại.'); }
    finally { inFlight.current = false; setSending(false); }
  };
  return <>
    <Button size="sm" className="min-h-10 rounded-full bg-[#D91D45] px-4 text-white hover:bg-[#BD1639]" disabled={disabled} onClick={() => setOpen(true)}><FlaskConical aria-hidden="true" />Hoàn mô phỏng</Button>
    <Dialog open={open} onOpenChange={value => { if (!inFlight.current) setOpen(value); }}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xác nhận hoàn mô phỏng</DialogTitle>
          <DialogDescription>Ghi nhận kết quả hoàn tiền trong ứng dụng để demo. Không chuyển tiền ngân hàng và không thay đổi giao dịch trên VNPAY.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-200 py-4"><span>Số tiền phải hoàn</span><MoneyText amount={integer(amount)} className="text-xl font-bold" /></div>
        {info?.provider && <p className="text-sm text-stone-600">Nguồn thanh toán: <strong className="text-stone-900">{info.provider}</strong>{info.environment === 'SANDBOX' ? ' · Sandbox' : info.environment === 'MOCK' ? ' · Mô phỏng' : ''}</p>}
        {loading && <p role="status" className="text-sm text-stone-600">Đang đối chiếu nghĩa vụ hoàn và giao dịch gốc…</p>}
        {info && <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700">{info.message}</p>}
        {canSimulate && <p className="text-sm text-stone-600">Số tiền đã trừ phí hủy theo chính sách. Xác nhận sẽ cập nhật khoản hoàn, vé liên quan và lịch sử xử lý; không cần nhập số tiền.</p>}
        {mismatch && <p role="alert" className="text-sm text-red-700">Số tiền đã thay đổi. Đóng hộp thoại và tải lại danh sách trước khi xác nhận.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Đóng</Button>
          {(!canSimulate || error) && <Button variant="outline" disabled={loading || sending} onClick={() => void refresh()}><RefreshCw aria-hidden="true" />Kiểm tra lại</Button>}
          {canSimulate && <Button className="bg-[#D91D45] text-white hover:bg-[#BD1639]" disabled={loading || sending || mismatch} onClick={() => void confirm()}>{sending ? 'Đang ghi nhận…' : 'Xác nhận hoàn mô phỏng'}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
