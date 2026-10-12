import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bookingService } from '../../composition';
import { tripService } from '@/modules/trip/composition';
import type { OrderEntity, OrderItemEntity } from '../../domain/entity/order.entity';
import type { CustomerTripEntity } from '@/modules/trip/domain/entity/customer-trip.entity';
import type { SeatEntity } from '@/modules/trip/domain/entity/seat.entity';
import type { TripPublicDetail, TripStopItem } from '@/modules/trip/application/port/trip.service.interface';
import type { ItemOperationPreview } from '../../application/port/booking.service.interface';
import {
  CustomerPageContainer,
  PageHeader,
  SurfaceCard,
  MoneyText,
  StatusBadge,
  InlineAlert,
  LoadingState,
  ErrorState,
} from '@/shared/presentation/components';
import { ArrowLeft, ArrowRight, Bus, CalendarDays, CheckCircle2, Clock, MapPin, RefreshCw, Sparkles, User } from 'lucide-react';

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const ExchangeTicketPage: React.FC = () => {
  const { orderId, itemId } = useParams<{ orderId: string; itemId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderEntity | null>(null);
  const [item, setItem] = useState<OrderItemEntity | null>(null);
  const [oldTrip, setOldTrip] = useState<TripPublicDetail | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [trips, setTrips] = useState<CustomerTripEntity[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<CustomerTripEntity | null>(null);
  const [seats, setSeats] = useState<SeatEntity[]>([]);
  const [stops, setStops] = useState<TripStopItem[]>([]);
  const [seatId, setSeatId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [preview, setPreview] = useState<ItemOperationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const boot = async () => {
      if (!orderId || !itemId) return;
      try {
        const loadedOrder = await bookingService.getOrder(orderId);
        const loadedItem = loadedOrder.items.find((candidate) => candidate.itemId === itemId);
        if (!loadedItem || !loadedItem.isExchangeable()) throw new Error('Vé này không còn đủ điều kiện đổi.');
        const detail = await tripService.getTripDetail(loadedItem.transportTripId);
        if (!active) return;
        setOrder(loadedOrder);
        setItem(loadedItem);
        setOldTrip(detail);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không thể tải thông tin vé cần đổi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void boot();
    return () => { active = false; };
  }, [orderId, itemId]);

  const searchTrips = async () => {
    if (!oldTrip) return;
    setSearching(true);
    setError(null);
    setPreview(null);
    try {
      const result = await tripService.searchTrips({
        origin: oldTrip.route.origin,
        destination: oldTrip.route.destination,
        departureDate: date,
        operatorId: oldTrip.operatorId,
        page: 1,
        limit: 50,
      });
      setTrips(result.data.filter((trip) => trip.id !== item?.transportTripId && !trip.isSoldOut()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tìm chuyến thay thế.');
    } finally {
      setSearching(false);
    }
  };

  const chooseTrip = async (trip: CustomerTripEntity) => {
    setSelectedTrip(trip);
    setSeatId('');
    setPickupStopId('');
    setDropoffStopId('');
    setPreview(null);
    setSearching(true);
    try {
      const [seatList, stopList] = await Promise.all([
        tripService.getTripSeats(trip.id),
        tripService.getTripStops(trip.id),
      ]);
      setSeats(seatList.filter((seat) => seat.isAvailable()));
      setStops(stopList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải ghế và điểm đón trả.');
    } finally {
      setSearching(false);
    }
  };

  const orderedStops = useMemo(
    () => [...stops].sort((a, b) => Number(a.orderIndex ?? a.order ?? 0) - Number(b.orderIndex ?? b.order ?? 0)),
    [stops]
  );
  const pickupStops = orderedStops.filter((stop) => stop.pickupAllowed !== false && stop.stopType !== 'DROPOFF' && stop.type !== 'DROPOFF');
  const dropoffStops = orderedStops.filter((stop) => stop.dropoffAllowed !== false && stop.stopType !== 'PICKUP' && stop.type !== 'PICKUP');

  const selectedSeatObj = useMemo(() => seats.find((s) => s.seatId === seatId), [seats, seatId]);
  const selectedPickupObj = useMemo(() => pickupStops.find((s) => s.id === pickupStopId), [pickupStops, pickupStopId]);
  const selectedDropoffObj = useMemo(() => dropoffStops.find((s) => s.id === dropoffStopId), [dropoffStops, dropoffStopId]);

  const request = selectedTrip && seatId && pickupStopId && dropoffStopId
    ? { tripId: selectedTrip.id, seatId, pickupStopId, dropoffStopId }
    : null;

  const loadPreview = async () => {
    if (!orderId || !itemId || !request) return;
    setSearching(true);
    setError(null);
    try {
      setPreview(await bookingService.previewExchangeItem(orderId, itemId, request));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Không thể tính chênh lệch đổi vé.');
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!orderId || !itemId || !request || !preview) return;
    const storageKey = `goticket:exchange:${orderId}:${itemId}`;
    const operationId = sessionStorage.getItem(storageKey) || crypto.randomUUID();
    sessionStorage.setItem(storageKey, operationId);
    setSubmitting(true);
    setError(null);
    try {
      const operation = await bookingService.exchangeItem(orderId, itemId, operationId, request);
      sessionStorage.setItem(`goticket:operation:${operation.operationId}`, JSON.stringify({ orderId, itemId }));
      sessionStorage.removeItem(storageKey);
      if (operation.state === 'WAITING_FUNDS' && Number(operation.topup) > 0) {
        const handoff = await bookingService.launchOperationPayment(operation.operationId);
        window.location.assign(handoff.url);
        return;
      }
      navigate(`/account/operations/${operation.operationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu đổi vé. Bạn có thể thử lại với cùng lựa chọn.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-12">
        <LoadingState message="Đang tải thông tin vé và chính sách đổi chuyến..." />
      </CustomerPageContainer>
    );
  }

  if (error && (!order || !item || !oldTrip)) {
    return (
      <CustomerPageContainer className="py-12">
        <ErrorState
          title="Không thể bắt đầu đổi vé"
          message={error}
          actionLabel="Quay lại đơn vé"
          onAction={() => navigate(orderId ? `/account/orders/${orderId}` : '/account/tickets')}
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
        <ArrowLeft className="h-4 w-4" /> Quay lại đơn vé
      </Link>

      <PageHeader
        title="Đổi chuyến hoặc đổi ghế"
        description={`Hành khách: ${item?.passengerName} · Ghế hiện tại: ${item?.transportSeatCode}. Hệ thống chỉ hỗ trợ đổi sang các chuyến cùng nhà xe có ghế trống.`}
        eyebrow="Dịch vụ hỗ trợ hành khách"
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: 3-step wizard */}
        <div className="space-y-6 lg:col-span-7">
          {/* Step 1: Chọn ngày và chuyến */}
          <SurfaceCard variant="glass" className="p-6 md:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft text-xs font-black text-coral border border-coral/25 shadow-2xs">
                1
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Chọn ngày khởi hành & chuyến mới
              </h2>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ngày khởi hành
                </label>
                <input
                  type="date"
                  min={tomorrow()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 shadow-2xs"
                />
              </div>
              <button
                type="button"
                onClick={() => void searchTrips()}
                disabled={searching}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#111827] px-6 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${searching ? 'animate-spin' : ''}`} />
                {searching ? 'Đang tìm...' : 'Tìm chuyến'}
              </button>
            </div>

            {trips.length > 0 && (
              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500">
                  Tìm thấy {trips.length} chuyến cùng nhà xe:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {trips.map((trip) => {
                    const isSelected = selectedTrip?.id === trip.id;
                    return (
                      <button
                        key={trip.id}
                        type="button"
                        onClick={() => void chooseTrip(trip)}
                        className={`rounded-3xl border p-4 text-left transition backdrop-blur-xs cursor-pointer ${
                          isSelected
                            ? 'border-coral bg-coral-soft/50 ring-2 ring-coral/30 shadow-sm'
                            : 'border-white/80 bg-white/70 hover:border-coral/40 hover:bg-white/90'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                            <Clock className="h-4 w-4 text-coral" />
                            {trip.getFormattedDepartureTime()}
                          </span>
                          <StatusBadge status="AVAILABLE" label={trip.getAvailableSeatsText()} />
                        </div>
                        <p className="mt-2 text-xs text-gray-500 font-medium">{trip.car.name}</p>
                        <div className="mt-2">
                          <MoneyText amount={trip.pricePerSeat} size="sm" weight="bold" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </SurfaceCard>

          {/* Step 2: Chọn ghế */}
          {selectedTrip && (
            <SurfaceCard variant="glass" className="p-6 md:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft text-xs font-black text-coral border border-coral/25 shadow-2xs">
                  2
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  Chọn vị trí ghế trống trên xe {selectedTrip.car.name}
                </h2>
              </div>

              {seats.length === 0 ? (
                <div className="mt-4">
                  <InlineAlert
                    variant="warning"
                    title="Hết ghế trống"
                    message="Chuyến xe được chọn hiện tại đã hết ghế trống. Vui lòng chọn giờ chạy khác."
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {seats.map((seat) => {
                      const isChosen = seatId === seat.seatId;
                      return (
                        <button
                          key={seat.seatId}
                          type="button"
                          aria-pressed={isChosen}
                          aria-label={seat.getAccessibleLabel(isChosen)}
                          onClick={() => {
                            setSeatId(seat.seatId);
                            setPreview(null);
                          }}
                          className={`flex h-11 items-center justify-center rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                            isChosen
                              ? 'bg-coral text-white shadow-md glow-coral-sm ring-2 ring-coral/40'
                              : 'border border-gray-200/80 bg-white/80 text-gray-900 hover:border-coral/50 hover:bg-coral-soft/40'
                          }`}
                        >
                          {seat.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </SurfaceCard>
          )}

          {/* Step 3: Điểm đón và trả */}
          {selectedTrip && seatId && (
            <SurfaceCard variant="glass" className="p-6 md:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft text-xs font-black text-coral border border-coral/25 shadow-2xs">
                  3
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  Chọn điểm đón & điểm trả
                </h2>
              </div>

              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Điểm đón khách
                  </label>
                  <select
                    value={pickupStopId}
                    onChange={(e) => {
                      setPickupStopId(e.target.value);
                      setPreview(null);
                    }}
                    className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 shadow-2xs"
                  >
                    <option value="">Chọn trạm hoặc điểm đón</option>
                    {pickupStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name} {stop.province ? `(${stop.province})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Điểm trả khách
                  </label>
                  <select
                    value={dropoffStopId}
                    onChange={(e) => {
                      setDropoffStopId(e.target.value);
                      setPreview(null);
                    }}
                    className="w-full rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20 shadow-2xs"
                  >
                    <option value="">Chọn trạm hoặc điểm trả</option>
                    {dropoffStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name} {stop.province ? `(${stop.province})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!request || searching}
                  onClick={() => void loadPreview()}
                  className="w-full rounded-full border border-gray-200/80 bg-white/90 py-3.5 text-sm font-bold text-gray-900 shadow-2xs transition hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 cursor-pointer"
                >
                  {searching ? 'Đang tính toán chênh lệch...' : 'Tính toán chi phí & chênh lệch vé'}
                </button>
              </div>
            </SurfaceCard>
          )}

          {error && (
            <InlineAlert
              variant="error"
              title="Lỗi xử lý"
              message={error}
            />
          )}
        </div>

        {/* Right Column: Comparison & Cost Preview Card */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-5">
          <SurfaceCard variant="glass-elevated" className="overflow-hidden p-6 md:p-7">
            <h3 className="font-serif text-lg font-bold text-gray-900">
              So sánh vé hiện tại & vé mới
            </h3>

            {/* Vé hiện tại */}
            <div className="mt-4 rounded-3xl border border-white/80 bg-white/70 backdrop-blur-xs p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Vé ban đầu
              </span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {oldTrip?.route.origin} → {oldTrip?.route.destination}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 font-medium">
                    Ghế {item?.transportSeatCode} · {item?.passengerName}
                  </p>
                </div>
                <StatusBadge status={item?.transportItemState || 'ACTIVE'} />
              </div>
            </div>

            {/* Mũi tên chuyển đổi */}
            <div className="my-2 flex justify-center text-coral">
              <ArrowRight className="h-5 w-5" />
            </div>

            {/* Vé dự kiến mới */}
            <div className={`rounded-3xl border p-4 transition backdrop-blur-xs ${
              selectedTrip
                ? 'border-coral/40 bg-coral-soft/40 shadow-2xs'
                : 'border-dashed border-gray-200 bg-white/40 text-gray-400'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-coral">
                Chuyến mới dự kiến
              </span>
              {selectedTrip ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-bold text-gray-900">
                    {selectedTrip.route.origin} → {selectedTrip.route.destination}
                  </p>
                  <p className="text-xs text-gray-600">
                    Khởi hành: <strong className="text-gray-900">{selectedTrip.getFormattedDepartureTime()}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    Ghế mới: <strong className="text-coral font-bold">{selectedSeatObj?.code || 'Chưa chọn'}</strong> · {selectedPickupObj?.name || 'Chưa chọn điểm đón'}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-gray-400">
                  Chưa chọn chuyến mới ở Bước 1.
                </p>
              )}
            </div>

            {/* Bảng chi phí & chênh lệch */}
            {preview && (
              <div className="mt-6 border-t border-gray-100/80 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Bảng chi phí chênh lệch
                </h4>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Giá trị vé cũ</span>
                    <MoneyText amount={preview.oldAmount} size="sm" weight="semibold" />
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Giá vé mới</span>
                    <MoneyText amount={preview.newAmount} size="sm" weight="semibold" />
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Phí chuyển đổi quy định</span>
                    <MoneyText amount={preview.fee} size="sm" weight="semibold" />
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    {Number(preview.topup) > 0 ? (
                      <div className="flex items-center justify-between rounded-2xl bg-coral-soft/80 p-3.5 border border-coral/20">
                        <span className="font-bold text-coral">Cần thanh toán thêm</span>
                        <MoneyText amount={preview.topup} size="lg" weight="extrabold" variant="coral" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200">
                        <span className="font-bold text-emerald-700">Số tiền hoàn lại</span>
                        <MoneyText amount={preview.refundDue} size="lg" weight="extrabold" />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white py-3.5 text-sm font-bold shadow-md glow-coral-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarDays className="h-4 w-4" />
                  )}
                  {Number(preview.topup) > 0 ? 'Thanh toán chênh lệch & Đổi vé' : 'Xác nhận hoàn tất đổi vé'}
                </button>
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </CustomerPageContainer>
  );
};
