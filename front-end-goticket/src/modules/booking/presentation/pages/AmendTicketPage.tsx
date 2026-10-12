import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, History, PencilLine, RefreshCw, Sparkles, User } from 'lucide-react';
import { bookingService } from '../../composition';
import { tripService } from '@/modules/trip/composition';
import type { OrderItemEntity } from '../../domain/entity/order.entity';
import type { TicketAmendmentRecord } from '../../application/port/booking.service.interface';
import type { TripStopItem } from '@/modules/trip/application/port/trip.service.interface';
import {
  CustomerPageContainer,
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
  ErrorState,
} from '@/shared/presentation/components';

const terminal = new Set(['COMPLETED', 'CONFLICT']);

export const AmendTicketPage: React.FC = () => {
  const { orderId, itemId } = useParams<{ orderId: string; itemId: string }>();
  const [item, setItem] = useState<OrderItemEntity | null>(null);
  const [stops, setStops] = useState<TripStopItem[]>([]);
  const [history, setHistory] = useState<TicketAmendmentRecord[]>([]);
  const [passengerName, setPassengerName] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadHistory = async (order: string, itemValue: string) => {
    const rows = await bookingService.getItemAmendments(order, itemValue);
    setHistory(rows);
    return rows;
  };

  useEffect(() => {
    let active = true;
    const boot = async () => {
      if (!orderId || !itemId) return;
      try {
        const order = await bookingService.getOrder(orderId);
        const current = order.items.find((candidate) => candidate.itemId === itemId);
        if (!current) throw new Error('Không tìm thấy vé trong đơn hàng này.');
        if (!current.isCancelable()) throw new Error('Chỉ có thể sửa vé đang có hiệu lực và chưa soát.');
        const [stopRows, historyRows] = await Promise.all([
          tripService.getTripStops(current.transportTripId),
          bookingService.getItemAmendments(orderId, itemId),
        ]);
        if (!active) return;
        setItem(current);
        setStops(stopRows);
        setHistory(historyRows);
        setPassengerName(current.passengerName);
        setPickupStopId(current.pickupStopId || '');
        setDropoffStopId(current.dropoffStopId || '');
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải thông tin sửa vé.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void boot();
    return () => { active = false; };
  }, [orderId, itemId]);

  useEffect(() => {
    if (!orderId || !itemId || !history.some((row) => !terminal.has(row.status))) return;
    const timer = window.setInterval(() => void loadHistory(orderId, itemId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [orderId, itemId, history]);

  const orderedStops = useMemo(
    () => [...stops].sort((a, b) => Number(a.orderIndex ?? a.order ?? 0) - Number(b.orderIndex ?? b.order ?? 0)),
    [stops],
  );
  const pickupStops = orderedStops.filter((stop) => stop.pickupAllowed !== false && stop.stopType !== 'DROPOFF' && stop.type !== 'DROPOFF');
  const dropoffStops = orderedStops.filter((stop) => stop.dropoffAllowed !== false && stop.stopType !== 'PICKUP' && stop.type !== 'PICKUP');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderId || !itemId || !passengerName.trim() || !pickupStopId || !dropoffStopId) return;
    const key = `goticket:amend:${orderId}:${itemId}`;
    const commandId = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, commandId);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await bookingService.amendItem(orderId, itemId, {
        commandId,
        passengerName: passengerName.trim(),
        pickupStopId,
        dropoffStopId,
      });
      if (terminal.has(result.status)) sessionStorage.removeItem(key);
      setMessage(result.status === 'COMPLETED' ? 'Thông tin vé đã được cập nhật và phát hành phiên bản mới.' : 'Yêu cầu đã được ghi nhận và đang đồng bộ vé.');
      await loadHistory(orderId, itemId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể gửi yêu cầu sửa vé. Bạn có thể thử lại an toàn.');
    } finally {
      setSaving(false);
    }
  };

  const retry = async (commandId: string) => {
    if (!orderId || !itemId) return;
    setSaving(true);
    setError('');
    try {
      await bookingService.retryAmendment(commandId);
      await loadHistory(orderId, itemId);
      setMessage('Đã yêu cầu hệ thống thử đồng bộ lại.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể thử lại yêu cầu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-12">
        <LoadingState message="Đang tải dữ liệu vé và lịch sử chỉnh sửa..." />
      </CustomerPageContainer>
    );
  }

  if (!item) {
    return (
      <CustomerPageContainer className="py-12">
        <ErrorState
          title="Không thể chỉnh sửa vé"
          message={error || 'Vé không tồn tại hoặc đã quá thời gian cho phép chỉnh sửa.'}
          actionLabel="Quay lại đơn vé"
          onAction={() => window.history.back()}
        />
      </CustomerPageContainer>
    );
  }

  return (
    <CustomerPageContainer className="space-y-6 py-8">
      <Link
        to={`/account/orders/${orderId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gt-muted)] transition-colors hover:text-[var(--gt-coral)]"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại chi tiết vé
      </Link>

      <PageHeader
        title="Chỉnh sửa thông tin vé"
        description={`Hành khách: ${item.passengerName} · Ghế: ${item.transportSeatCode} · Phiên bản vé (Revision): ${item.transportTicketRevision}`}
        eyebrow="Quản lý vé điện tử"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form chỉnh sửa */}
        <div className="lg:col-span-7">
          <SurfaceCard className="p-6 md:p-8">
            <div className="flex items-center gap-2.5 border-b border-[var(--gt-border-soft)] pb-4">
              <PencilLine className="h-5 w-5 text-[var(--gt-coral)]" />
              <h2 className="text-base font-bold text-[var(--gt-ink)]">
                Cập nhật thông tin hành khách & điểm đón/trả
              </h2>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                  Họ và tên hành khách <span className="text-[var(--gt-coral)]">*</span>
                </label>
                <input
                  required
                  maxLength={120}
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                    Điểm đón khách <span className="text-[var(--gt-coral)]">*</span>
                  </label>
                  <select
                    required
                    value={pickupStopId}
                    onChange={(e) => setPickupStopId(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                  >
                    <option value="">Chọn điểm đón</option>
                    {pickupStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                    Điểm trả khách <span className="text-[var(--gt-coral)]">*</span>
                  </label>
                  <select
                    required
                    value={dropoffStopId}
                    onChange={(e) => setDropoffStopId(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
                  >
                    <option value="">Chọn điểm trả</option>
                    {dropoffStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <InlineAlert variant="error" title="Lỗi cập nhật" message={error} />
              )}
              {message && (
                <InlineAlert variant="success" title="Thông báo" message={message} />
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-coral flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold shadow-md disabled:opacity-50 sm:w-auto sm:px-8"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {saving ? 'Đang lưu cập nhật...' : 'Xác nhận cập nhật vé'}
                </button>
              </div>
            </form>
          </SurfaceCard>
        </div>

        {/* Lịch sử chỉnh sửa */}
        <div className="lg:col-span-5">
          <SurfaceCard className="p-6 md:p-8">
            <div className="flex items-center gap-2.5 border-b border-[var(--gt-border-soft)] pb-4">
              <History className="h-5 w-5 text-[var(--gt-muted)]" />
              <h2 className="text-base font-bold text-[var(--gt-ink)]">
                Lịch sử các lần chỉnh sửa
              </h2>
            </div>

            {history.length === 0 ? (
              <p className="mt-4 text-xs text-[var(--gt-muted)]">
                Vé này chưa từng có yêu cầu sửa đổi thông tin.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {history.map((row) => (
                  <div
                    key={row.commandId}
                    className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface-soft)] p-4 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-[var(--gt-ink)]">
                        {row.passengerName}
                      </strong>
                      <StatusBadge status={row.status} />
                    </div>

                    <p className="mt-1 text-xs text-[var(--gt-muted)]">
                      Lúc {new Date(row.createdAt).toLocaleString('vi-VN')}
                      {row.newRevision ? ` · Phiên bản: rev-${row.newRevision}` : ''}
                    </p>

                    {row.errorReason && (
                      <p className="mt-2 text-xs text-[var(--gt-danger)]">
                        {row.errorReason}
                      </p>
                    )}

                    {['ATTENTION', 'CONFLICT'].includes(row.status) && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void retry(row.commandId)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--gt-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gt-ink)] transition hover:border-[var(--gt-coral)] hover:text-[var(--gt-coral)]"
                      >
                        <RefreshCw className="h-3 w-3" /> Thử đồng bộ lại
                      </button>
                    )}

                    {row.status === 'PENDING' && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--gt-warning)]">
                        <Clock className="h-3.5 w-3.5" /> Hệ thống đang đồng bộ
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </CustomerPageContainer>
  );
};
