import { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  Button,
  ConfirmDialog,
  SurfaceCard,
} from '@/shared/presentation/components';

const percent = (rate: string | number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(
    Number(rate) * 100,
  );
export function TransportCommissionSettings() {
  const [current, setCurrent] = useState<{
    rate: string;
    reason?: string;
  } | null>(null);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    httpClient
      .get<{ rate: string; reason?: string }>(
        '/api/v1/payouts/transport/commission',
        { signal: controller.signal },
      )
      .then((data) => {
        setCurrent(data);
        setValue(String(Number(data.rate) * 100));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const validate = () => {
    const parsed = Number(value.replace(',', '.'));
    if (
      !/^\d{1,2}(?:[.,]\d{1,2})?$/.test(value) ||
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > 50
    ) {
      setError('Nhập tỷ lệ từ 0 đến 50%, tối đa 2 chữ số thập phân.');
      return;
    }
    if (!reason.trim()) {
      setError('Nhập lý do điều chỉnh hoa hồng.');
      return;
    }
    setError('');
    setConfirm(true);
  };
  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await httpClient.put<{ rate: string; reason?: string }>(
        '/api/v1/payouts/transport/commission',
        {
          rate: (Number(value.replace(',', '.')) / 100).toFixed(4),
          reason: reason.trim(),
        },
      );
      setCurrent(saved);
      setValue(String(Number(saved.rate) * 100));
      setReason('');
      setConfirm(false);
      setNotice(`Đã lưu hoa hồng GoTicket ${percent(saved.rate)}%.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được hoa hồng.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <SurfaceCard className="rounded-[28px] p-5 sm:p-6">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-semibold text-[var(--gt-ink)] focus-visible:outline-2 focus-visible:outline-[var(--gt-brand)]">
            <span className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-[var(--gt-brand)]" /> Hoa hồng
              GoTicket
            </span>
            <span className="text-sm text-[var(--gt-muted)]">
              {current
                ? `${percent(current.rate)}% · Điều chỉnh`
                : 'Đang tải cấu hình…'}
            </span>
          </summary>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--gt-muted)]">
            Áp dụng cho khoản thanh toán và ca tiền mặt mới của GoTicket. Các
            khoản đã chốt giữ nguyên tỷ lệ.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-[160px_1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="transport-commission-percent"
                className="mb-2 block text-sm font-semibold"
              >
                Hoa hồng (%)
              </label>
              <input
                id="transport-commission-percent"
                inputMode="decimal"
                value={value}
                disabled={!current || busy}
                onChange={(e) => setValue(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--gt-border)] bg-white px-3 focus:outline-2 focus:outline-[var(--gt-brand)]"
              />
            </div>
            <div>
              <label
                htmlFor="transport-commission-reason"
                className="mb-2 block text-sm font-semibold"
              >
                Lý do thay đổi
              </label>
              <input
                id="transport-commission-reason"
                value={reason}
                maxLength={500}
                disabled={!current || busy}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: điều chỉnh chính sách dành cho nhà xe"
                className="h-11 w-full rounded-xl border border-[var(--gt-border)] bg-white px-3 focus:outline-2 focus:outline-[var(--gt-brand)]"
              />
            </div>
            <Button
              disabled={!current || busy}
              onClick={validate}
              className="h-11 rounded-full bg-[var(--gt-brand)] px-5 text-white"
            >
              Lưu hoa hồng
            </Button>
          </div>
          {current?.reason && (
            <p className="mt-3 text-xs text-[var(--gt-muted)]">
              Lần cập nhật trước: {current.reason}
            </p>
          )}
        </details>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}
      </SurfaceCard>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Lưu hoa hồng GoTicket?"
        description={
          <>
            <span>{`Đổi từ ${current ? percent(current.rate) : '—'}% sang ${Number(value.replace(',', '.'))}%. Áp dụng cho khoản thanh toán và ca tiền mặt mới của GoTicket.`}</span>
            {error && (
              <span role="alert" className="mt-3 block text-red-700">
                {error}
              </span>
            )}
          </>
        }
        confirmLabel="Lưu thay đổi"
        loading={busy}
        onConfirm={save}
      />
    </>
  );
}
