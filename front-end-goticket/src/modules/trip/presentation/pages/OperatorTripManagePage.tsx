import React, { useEffect, useState } from 'react';
import { TripStatusVO } from '../../domain/value-object/trip-status.vo';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  Plus,
  Clock,
  MapPin,
  Tag,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  InlineAlert,
  LoadingState,
  Button,
  IdText,
} from '@/shared/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Seat = { seatId?: string; id?: string; code?: string; status?: string; seatClass?: string };
type RouteStop = { id: string; name: string; order: number };
type StopOverride = {
  routeStopId: string;
  order: number;
  type: 'PICKUP' | 'DROPOFF' | 'BOTH';
  scheduledAt?: string;
};

const toLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const OperatorTripManagePage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const tripsPath = useLocation().pathname.startsWith('/staff') ? '/staff/trips' : '/operator/trips';
  const [detail, setDetail] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({ STANDARD: '' });
  const [reason, setReason] = useState('Bảo trì vận hành');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [stopOverrides, setStopOverrides] = useState<StopOverride[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now);

  // Dialog states replacing window.prompt
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [addClassModalOpen, setAddClassModalOpen] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState('');

  const load = async () => {
    if (!tripId) return;
    setBusy(true);
    setError('');
    try {
      const manage = await httpClient.get<any>(`/api/v1/trips/${tripId}/manage`);
      let seatMap: any = [];
      if (manage.offerListingId && !['DRAFT', 'CANCELLED', 'PUBLISHING'].includes(manage.status)) {
        try {
          seatMap = await httpClient.get<any>(`/api/v1/trips/${tripId}/manage/seats`);
        } catch (seatError) {
          setError(seatError instanceof Error ? seatError.message : 'Không thể tải trạng thái ghế.');
        }
      }
      const seatRows = Array.isArray(seatMap) ? seatMap : Array.isArray(seatMap?.seats) ? seatMap.seats : [];
      const routeStops: RouteStop[] = Array.isArray(manage?.route?.stops) ? manage.route.stops : [];
      const savedStops: StopOverride[] = Array.isArray(manage?.stopOverrides) ? manage.stopOverrides : [];
      setDetail(manage);
      setSeats(seatRows);
      setSelected([]);
      setDepartureTime(toLocalInput(manage?.departureTime));
      setArrivalTime(toLocalInput(manage?.arrivalTime));
      setBasePrice(String(manage?.priceVnd ?? ''));
      setPrices(
        Object.fromEntries(
          [...new Set<string>((manage?.car?.seatTemplates || [])
            .filter((seat: any) => seat.active !== false)
            .map((seat: any) => String(seat.seatClass || 'STANDARD')))]
            .map((name) => [name, String(manage?.classPrices?.[name] ?? manage?.priceVnd ?? '')]),
        ),
      );
      setStopOverrides(
        routeStops.map((stop, index) => {
          const saved = savedStops.find((item) => item.routeStopId === stop.id);
          return {
            routeStopId: stop.id,
            order: index,
            type: saved?.type ?? 'BOTH',
            scheduledAt: toLocalInput(saved?.scheduledAt),
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chuyến xe.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [tripId]);

  const run = async (path: string, method: 'post' | 'put' | 'patch' = 'post', body?: unknown) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await httpClient[method](`/api/v1/trips/${tripId}/${path}`, body);
      setMessage('Thao tác đã được máy chủ ghi nhận thành công.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () =>
    run('draft', 'patch', {
      departureTime: departureTime ? new Date(departureTime).toISOString() : undefined,
      arrivalTime: arrivalTime ? new Date(arrivalTime).toISOString() : undefined,
      priceVnd: basePrice,
    });

  const saveStops = () =>
    run('stops', 'put', {
      stops: stopOverrides.map((stop) => ({
        ...stop,
        scheduledAt: stop.scheduledAt ? new Date(stop.scheduledAt).toISOString() : undefined,
        pickupAllowed: stop.type !== 'DROPOFF',
        dropoffAllowed: stop.type !== 'PICKUP',
      })),
    });

  const savePrices = () => {
    if (Object.values(prices).some((value) => !/^[1-9]\d{0,17}$/.test(value))) {
      setError('Mỗi hạng ghế cần giá VND nguyên dương hợp lệ.');
      return;
    }
    return run('class-prices', 'put', { classPrices: prices });
  };

  const block = (blocked: boolean) =>
    run('seat-blocks', 'put', { seatIds: selected, blocked, reason });

  const handleConfirmCancelTrip = () => {
    if (!cancelReasonInput.trim()) return;
    setCancelModalOpen(false);
    void run('cancel', 'post', { reason: cancelReasonInput.trim() });
  };

  const handleConfirmAddClass = () => {
    const formatted = newClassNameInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (!formatted) return;
    if (!(detail?.car?.seatTemplates || []).some((seat: any) => seat.active !== false && seat.seatClass === formatted)) {
      setError('Hạng ghế này không có trong sơ đồ xe. Hãy cấu hình hạng trên xe trước.');
      return;
    }
    setPrices((curr) => ({ ...curr, [formatted]: '' }));
    setNewClassNameInput('');
    setAddClassModalOpen(false);
  };

  const isDraft = detail?.status === 'DRAFT';
  const departureReached = new Date(detail?.departureTime).getTime() <= now;
  const routeDeleted = Boolean(detail?.route?.deletedAt);
  const planningAllowed = !routeDeleted && detail?.route?.status === 'ACTIVE' && detail?.car?.status === 'ACTIVE';
  const canOpenSale = isDraft && !departureReached && planningAllowed;
  const canResumeSale = detail?.status === 'STOP_SALE' && !departureReached && planningAllowed && Boolean(detail?.offerListingId);
  const canComplete = ['ON_SALE', 'STOP_SALE', 'SCHEDULED', 'DEPARTED'].includes(detail?.status)
    && new Date(detail?.arrivalTime).getTime() <= now;
  const displayStatus = departureReached && ['ON_SALE', 'PUBLISHING', 'SCHEDULED'].includes(detail?.status)
    ? 'STOP_SALE' : detail?.status;
  const statusLabel = displayStatus === 'STOP_SALE'
    ? departureReached ? 'Đã đến giờ khởi hành · Đã ngừng bán' : 'Đã ngừng bán'
    : TripStatusVO.getLabel(displayStatus || '');
  const routeStops: RouteStop[] = Array.isArray(detail?.route?.stops) ? detail.route.stops : [];

  if (busy && !detail) {
    return <LoadingState message="Đang tải dữ liệu trung tâm vận hành chuyến..." />;
  }

  const tripSummary = `${detail?.route?.origin || 'Điểm đi'} ➔ ${detail?.route?.destination || 'Điểm đến'}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={tripSummary}
        eyebrow="Trung tâm vận hành chuyến"
        description={
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <IdText id={tripId || ''} prefix="Chuyến" />
            <span>·</span>
            <span>Trạng thái chuyến:</span>
            <StatusBadge status={displayStatus || 'DRAFT'} label={statusLabel} />
            {['COMPLETED', 'CANCELLED', 'DEPARTED'].includes(displayStatus) && <StatusBadge status="STOP_SALE" label="Đã ngừng bán" />}
          </div>
        }
        breadcrumbs={[
          { label: 'Danh sách chuyến xe', to: tripsPath },
          { label: `Vận hành ${tripId?.slice(0, 8)}` },
        ]}
      />

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi thao tác"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {message && (
        <InlineAlert
          variant="success"
          title="Thông báo"
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      {/* Thông tin chuyến nháp */}
      {isDraft && (
        <SurfaceCard variant="glass" className="p-6 rounded-[28px]">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="h-4 w-4 text-[#FF385C]" />
            <h2 className="text-base font-bold text-gray-900">Cấu hình chuyến nháp</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Các trường thời gian và giá cơ bản chỉ được phép chỉnh sửa khi chuyến đang ở trạng thái Nháp (DRAFT).
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Giờ khởi hành
              </label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Giờ đến dự kiến
              </label>
              <input
                type="datetime-local"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Giá vé cơ bản (VNĐ)
              </label>
              <input
                inputMode="numeric"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value.replace(/\D/g, ''))}
                placeholder="250000"
                className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100/80 flex justify-end">
            <Button
              disabled={busy || !departureTime || !arrivalTime || !basePrice}
              onClick={() => void saveDraft()}
              className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-md glow-coral-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Lưu thông tin nháp
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* Điểm đón trả của chuyến */}
      {isDraft && routeStops.length >= 2 && (
        <SurfaceCard variant="glass" className="p-6 rounded-[28px]">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-[#FF385C]" />
            <h2 className="text-base font-bold text-gray-900">Lộ trình & Điểm đón trả</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Cấu hình quyền đón/trả và giờ dự kiến riêng cho từng điểm dừng thuộc chuyến này.
          </p>

          <div className="space-y-3">
            {routeStops.map((routeStop, index) => {
              const value = stopOverrides[index];
              if (!value) return null;
              return (
                <div
                  key={routeStop.id}
                  className="grid items-center gap-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-2xs md:grid-cols-[48px_1fr_180px_220px]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft font-mono text-xs font-bold text-[#FF385C] border border-[#FF385C]/20 shadow-xs">
                    #{index + 1}
                  </span>
                  <div>
                    <strong className="block text-xs font-bold text-gray-900">
                      {routeStop.name}
                    </strong>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {index === 0
                        ? 'Điểm đầu tuyến'
                        : index === routeStops.length - 1
                        ? 'Điểm cuối tuyến'
                        : 'Điểm trung gian'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Hình thức
                    </label>
                    <select
                      value={value.type}
                      onChange={(e) =>
                        setStopOverrides((items) =>
                          items.map((item, i) =>
                            i === index
                              ? { ...item, type: e.target.value as StopOverride['type'] }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-full border border-gray-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 focus:border-[#FF385C] shadow-2xs"
                    >
                      <option value="BOTH">Đón và trả</option>
                      <option value="PICKUP">Chỉ đón</option>
                      <option value="DROPOFF">Chỉ trả</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Giờ dự kiến
                    </label>
                    <input
                      type="datetime-local"
                      value={value.scheduledAt ?? ''}
                      onChange={(e) =>
                        setStopOverrides((items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, scheduledAt: e.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-full border border-gray-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 focus:border-[#FF385C] shadow-2xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100/80 flex justify-end">
            <Button
              disabled={busy}
              onClick={() => void saveStops()}
              className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-md glow-coral-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Lưu cấu hình điểm dừng
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* Mở bán & Vòng đời */}
      <SurfaceCard variant="glass" className="p-6 rounded-[28px]">
        <h2 className="text-base font-bold text-gray-900 mb-1">Bán vé & Lịch khởi hành</h2>
        <p className="text-xs text-gray-500 mb-5">
          Đến giờ khởi hành, hệ thống tự ngừng bán vé. Nhà xe không cần bấm xác nhận xuất bến.
        </p>
        {departureReached && <p className="mb-4 text-sm text-stone-700">Đã qua giờ khởi hành. Không thể mở bán lại chuyến này.</p>}
        {routeDeleted && <p className="mb-4 text-sm text-stone-700">Tuyến đã được xóa khỏi danh mục. Lịch sử chuyến và vé vẫn được giữ; không thể phát hành hoặc mở bán lại từ tuyến này.</p>}

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            disabled={busy || !canOpenSale}
            onClick={() => void run('publish')}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Phát hành / Mở bán
          </Button>

          <Button
            variant="outline"
            disabled={busy || detail?.status !== 'ON_SALE' || departureReached}
            onClick={() => void run('stop-sale')}
            className="rounded-full border-amber-300 bg-amber-50/90 text-amber-800 hover:bg-amber-100 shadow-2xs"
          >
            <PauseCircle className="h-4 w-4 mr-2" />
            Ngừng bán vé
          </Button>

          <Button
            variant="outline"
            disabled={busy || !canResumeSale}
            onClick={() => void run('resume-sale')}
            className="rounded-full border-emerald-300 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100 shadow-2xs"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Mở bán lại
          </Button>

          <Button
            variant="outline"
            disabled={busy || !canComplete}
            onClick={() => void run('lifecycle', 'put', { status: 'COMPLETED' })}
            className="rounded-full border-stone-300 bg-white/90 text-stone-800 hover:bg-stone-50 shadow-2xs"
          >
            Hoàn thành chuyến
          </Button>

          <Button
            variant="outline"
            disabled={busy || !['ON_SALE', 'STOP_SALE'].includes(detail?.status)}
            onClick={() => {
              setCancelReasonInput(reason);
              setCancelModalOpen(true);
            }}
            className="rounded-full border-rose-300 bg-white/90 text-rose-700 hover:bg-rose-50 shadow-2xs"
          >
            <Ban className="h-4 w-4 mr-2" />
            Hủy chuyến xe
          </Button>
        </div>
      </SurfaceCard>

      {/* Giá theo hạng & Chặn/Mở ghế */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Giá theo hạng */}
        <SurfaceCard variant="glass" className="p-6 rounded-[28px]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-gray-900">Giá theo hạng ghế</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewClassNameInput('');
                setAddClassModalOpen(true);
              }}
              className="text-xs rounded-full border-gray-200/80 bg-white/90 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Thêm hạng ghế
            </Button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Định giá vé riêng cho từng phân hạng như VIP, STANDARD, v.v.
          </p>

          <div className="space-y-3">
            {Object.entries(prices).map(([name, value]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 p-3 bg-white/70 backdrop-blur-md shadow-2xs"
              >
                <span className="font-mono text-xs font-bold text-gray-900">
                  {name}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={value}
                    onChange={(e) =>
                      setPrices((current) => ({
                        ...current,
                        [name]: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="250000"
                    className="w-36 rounded-full border border-gray-200/80 bg-white/90 px-3 py-1.5 text-right font-mono text-xs font-bold outline-none focus:border-[#FF385C] shadow-2xs"
                  />
                  <span className="text-xs font-semibold text-gray-500">VNĐ</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100/80 flex justify-end">
            <Button
              disabled={busy}
              onClick={() => void savePrices()}
              className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-md glow-coral-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Lưu bảng giá ghế
            </Button>
          </div>
        </SurfaceCard>

        {/* Chặn hoặc mở ghế */}
        <SurfaceCard variant="glass" className="p-6 rounded-[28px]">
          <h2 className="text-base font-bold text-gray-900 mb-1">Chặn hoặc mở ghế</h2>
          <p className="text-xs text-gray-500 mb-3">
            Chọn một hoặc nhiều ghế để khóa bảo trì hoặc mở lại chỗ cho khách đặt.
          </p>

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2 text-xs font-medium text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs mb-3"
            placeholder="Lý do khóa / mở ghế (ví dụ: Bảo trì ghế hỏng)"
          />

          <div className="max-h-60 overflow-y-auto rounded-2xl border border-white/80 bg-white/50 backdrop-blur-md p-3 shadow-2xs">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {seats.map((seat) => {
                const id = seat.seatId || seat.id || '';
                const isSelected = selected.includes(id);
                const isBlocked = seat.status === 'BLOCKED';

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setSelected((items) =>
                        items.includes(id) ? items.filter((v) => v !== id) : [...items, id]
                      )
                    }
                    className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF385C] text-white shadow-xs glow-coral-sm'
                        : isBlocked
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-white/90 text-gray-900 border border-gray-200/80 hover:border-[#FF385C]'
                    }`}
                  >
                    {seat.code || id.slice(0, 4)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Đã chọn: <strong className="text-gray-900 font-bold">{selected.length}</strong> ghế
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!selected.length || !reason.trim() || busy}
                onClick={() => void block(false)}
                className="rounded-full border-emerald-300 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100 text-xs shadow-2xs"
              >
                Mở lại ghế
              </Button>
              <Button
                disabled={!selected.length || !reason.trim() || busy}
                onClick={() => void block(true)}
                className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-2xs"
              >
                Chặn ghế đã chọn
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Cancel Trip Dialog (replacing window.prompt) */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-[28px] border-white/80 bg-white/95 backdrop-blur-xl p-6 shadow-glass-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-700">
              Xác nhận hủy chuyến xe
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Hành động này sẽ hủy chuyến đi và hoàn vé cho tất cả khách hàng đã thanh toán.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Lý do hủy chuyến (bắt buộc)
            </label>
            <input
              type="text"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="VD: Xe gặp sự cố kỹ thuật đột xuất"
              className="w-full rounded-full border border-gray-200/80 bg-white/90 p-3 text-xs font-medium text-gray-900 outline-none focus:border-rose-500 shadow-2xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} className="rounded-full">
              Quay lại
            </Button>
            <Button
              disabled={!cancelReasonInput.trim()}
              onClick={handleConfirmCancelTrip}
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
            >
              Xác nhận hủy chuyến
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Seat Class Dialog (replacing window.prompt) */}
      <Dialog open={addClassModalOpen} onOpenChange={setAddClassModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[28px] border-white/80 bg-white/95 backdrop-blur-xl p-6 shadow-glass-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Thêm phân hạng ghế mới
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Nhập mã định danh hạng ghế (viết hoa, không dấu, ví dụ: VIP, FIRST_CLASS, SUITE).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Mã hạng ghế
            </label>
            <input
              type="text"
              value={newClassNameInput}
              onChange={(e) => setNewClassNameInput(e.target.value.toUpperCase())}
              placeholder="VIP"
              className="w-full rounded-full border border-gray-200/80 bg-white/90 p-3 font-mono text-xs font-bold text-gray-900 outline-none focus:border-[#FF385C] shadow-2xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddClassModalOpen(false)} className="rounded-full">
              Hủy
            </Button>
            <Button
              disabled={!newClassNameInput.trim()}
              onClick={handleConfirmAddClass}
              className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-md glow-coral-sm"
            >
              Thêm hạng ghế
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
