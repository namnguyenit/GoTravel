import React, { useState, useEffect } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { useAuth } from '@/modules/auth/presentation/context/AuthContext';
import { tripService } from '@/modules/trip/composition';
import type { TripEntity } from '@/modules/trip/domain/entity/trip.entity';
import type { TripStopItem } from '@/modules/trip/application/port/trip.service.interface';
import type { SeatEntity } from '@/modules/trip/domain/entity/seat.entity';
import { SeatMap } from '@/modules/trip/presentation/components/SeatMap';
import { formatVnd, MoneyVo } from '@/shared/domain/money.vo';
import {
  PageHeader,
  SurfaceCard,
  MoneyText,
  IdText,
  InlineAlert,
  LoadingState,
  Button,
  ConfirmDialog,
} from '@/shared/presentation/components';
import {
  Store,
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  Printer,
  ShieldAlert,
  MapPin,
  Banknote,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export const OperatorCounterPage: React.FC = () => {
  const { user } = useAuth();

  // Trips selector
  const [trips, setTrips] = useState<TripEntity[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [loadingTrips, setLoadingTrips] = useState<boolean>(true);

  // Seat map & selection
  const [seats, setSeats] = useState<SeatEntity[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState<boolean>(false);

  // Stops for selected trip
  const [stops, setStops] = useState<TripStopItem[]>([]);
  const [selectedPickupStopId, setSelectedPickupStopId] = useState<string>('');
  const [selectedDropoffStopId, setSelectedDropoffStopId] = useState<string>('');

  // Passenger & buyer inputs
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  // 2-Step Transaction States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [receivingCash, setReceivingCash] = useState<boolean>(false);
  const [cancellingUnpaid, setCancellingUnpaid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);

  // Step 1 created order waiting for physical cash
  const [pendingCashOrder, setPendingCashOrder] = useState<any | null>(null);
  // Step 2 final confirmed order with cash receipt
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Stable idempotency key
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  // Check SELL_CASH capability
  const hasSellCash = user?.hasCapability('SELL_CASH') || user?.isVendor() || user?.isAdmin();

  // Load operator trips
  useEffect(() => {
    let isMounted = true;
    const fetchTrips = async () => {
      try {
        setLoadingTrips(true);
        let tripsList: any[] = [];
        if (user?.isStaff() && !user?.isVendor()) {
          tripsList = await tripService.getAssignedStaffTrips();
        } else {
          const res = await tripService.getTrips({ limit: 50 });
          tripsList = res.data;
        }

        if (isMounted) {
          const validTrips = tripsList.filter(
            (t) => t.status === 'ON_SALE' || t.status === 'PUBLISHING' || t.status === 'STOP_SALE'
          );
          setTrips(validTrips.length > 0 ? validTrips : tripsList);
          if (validTrips[0]) setSelectedTripId(validTrips[0].id);
          else if (tripsList[0]) setSelectedTripId(tripsList[0].id);
        }
      } catch {
        if (isMounted) setTrips([]);
      } finally {
        if (isMounted) setLoadingTrips(false);
      }
    };

    fetchTrips();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load seats and stops when selected trip changes
  useEffect(() => {
    if (!selectedTripId) return;

    let isMounted = true;
    const fetchTripData = async () => {
      try {
        setLoadingSeats(true);
        setSelectedSeatIds([]);
        const [tripSeats, tripDetail] = await Promise.all([
          tripService.getTripSeats(selectedTripId),
          tripService.getTripDetail(selectedTripId),
        ]);

        if (isMounted) {
          setSeats(tripSeats);
          const tripStops = tripDetail?.stops || [];
          setStops(tripStops);

          const pickup = tripStops.find((s) => s.type === 'PICKUP' || s.type === 'BOTH') || tripStops[0];
          const dropoff =
            [...tripStops].reverse().find((s) => s.type === 'DROPOFF' || s.type === 'BOTH') ||
            tripStops[tripStops.length - 1];

          setSelectedPickupStopId(pickup?.id || '');
          setSelectedDropoffStopId(dropoff?.id || '');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Không thể tải sơ đồ ghế chuyến xe.');
        }
      } finally {
        if (isMounted) setLoadingSeats(false);
      }
    };

    fetchTripData();

    return () => {
      isMounted = false;
    };
  }, [selectedTripId]);

  const handleToggleSeat = (seatId: string) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalAmount = selectedSeats.reduce(
    (acc, seat) => acc.add(new MoneyVo(seat.priceVnd || 0)),
    new MoneyVo(0)
  );

  const pickupStops = stops.filter((s) => s.type === 'PICKUP' || s.type === 'BOTH');
  const dropoffStops = stops.filter((s) => s.type === 'DROPOFF' || s.type === 'BOTH');

  // Step 1: Create cash checkout order
  const handleCashCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      setError('Vui lòng chọn ít nhất một ghế.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Vui lòng nhập đầy đủ tên và số điện thoại hành khách.');
      return;
    }
    if (!selectedPickupStopId || !selectedDropoffStopId) {
      setError('Vui lòng chọn trạm đón và trạm trả hợp lệ.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        tripId: selectedTripId,
        fullName: customerName.trim(),
        email: customerEmail.trim() || 'quay.ve@goticket.vn',
        phone: customerPhone.trim(),
        passengers: selectedSeats.map((seat) => ({
          seatId: seat.id,
          name: customerName.trim(),
          pickupStopId: selectedPickupStopId,
          dropoffStopId: selectedDropoffStopId,
        })),
      };

      const res = await httpClient.post<any>('/api/v1/orders/transport/cash/checkout', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      const orderData = res?.data || res;
      setPendingCashOrder(orderData);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Giữ chỗ bán vé tiền mặt thất bại. Vui lòng kiểm tra ca thu tiền mặt đang mở hoặc ghế đã được chọn.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Confirm physical cash received
  const handleReceiveCashPayment = async () => {
    if (!pendingCashOrder) return;
    const orderId = pendingCashOrder.id || pendingCashOrder.orderId;
    if (!orderId) return;

    setReceivingCash(true);
    setError(null);

    try {
      const amountToCollect =
        pendingCashOrder.totalPrice || pendingCashOrder.totalAmount || totalAmount.toNumber();
      const res = await httpClient.post<any>(
        `/api/v1/orders/transport/cash/orders/${orderId}/receive`,
        { amount: amountToCollect }
      );

      const receiptData = res?.data || res;
      setSuccessOrder({
        ...pendingCashOrder,
        status: receiptData?.orderStatus || 'PENDING',
        receipt: receiptData,
      });
      setPendingCashOrder(null);
      setSelectedSeatIds([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setIdempotencyKey(crypto.randomUUID());

      const updatedSeats = await tripService.getTripSeats(selectedTripId);
      setSeats(updatedSeats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xác nhận thu tiền mặt thất bại.');
    } finally {
      setReceivingCash(false);
    }
  };

  // Cancel unpaid cash checkout order via ConfirmDialog
  const handleConfirmCancelUnpaidOrder = async () => {
    if (!pendingCashOrder) return;
    const orderId = pendingCashOrder.id || pendingCashOrder.orderId;
    if (!orderId) return;

    setIsCancelConfirmOpen(false);
    setCancellingUnpaid(true);
    try {
      await httpClient.post<any>(`/api/v1/orders/transport/cash/orders/${orderId}/cancel-unpaid`);
      setPendingCashOrder(null);
      setIdempotencyKey(crypto.randomUUID());

      const updatedSeats = await tripService.getTripSeats(selectedTripId);
      setSeats(updatedSeats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Hủy đơn giữ chỗ thất bại.');
    } finally {
      setCancellingUnpaid(false);
    }
  };

  if (!hasSellCash) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-[var(--gt-border)] text-center shadow-sm">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-[var(--gt-ink)] mb-1">
          Chưa được cấp quyền bán vé tại quầy
        </h3>
        <p className="text-xs text-[var(--gt-muted)]">
          Tài khoản của bạn cần có quyền SELL_CASH và một ca thu tiền đang mở để thực hiện tác nghiệp bán vé thu tiền mặt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Quầy bán vé & Thu tiền mặt"
        eyebrow="Kênh Nhà Xe · Tác nghiệp trực tiếp"
        description="Xuất vé trực tiếp tại bến, giữ chỗ theo thời gian thực và ghi nhận biên lai thu tiền mặt vào ca làm việc."
        actions={
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--gt-coral-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--gt-coral)]">
            <Wallet className="w-3.5 h-3.5" />
            <span>Quyền: SELL_CASH</span>
          </div>
        }
      />

      {error && (
        <InlineAlert
          variant="error"
          title="Thông báo lỗi"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Success Order View */}
      {successOrder ? (
        (() => {
          const isIssued = ['CONFIRMED', 'COMPLETED'].includes(successOrder.status || '');
          return (
            <SurfaceCard
              className={`p-8 text-center space-y-4 border ${
                isIssued
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              {isIssued ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              ) : (
                <Clock className="w-12 h-12 text-amber-600 mx-auto" />
              )}
              <h2
                className={`text-xl font-bold ${
                  isIssued ? 'text-emerald-950' : 'text-amber-950'
                }`}
              >
                {isIssued
                  ? 'Đã xuất vé và thu tiền mặt thành công!'
                  : 'Đã thu tiền mặt thành công, vé đang chờ phát hành!'}
              </h2>
              <p className="text-xs text-[var(--gt-muted)]">
                {isIssued
                  ? 'Vé điện tử đã phát hành và sẵn sàng lên xe.'
                  : `Đã ghi nhận tiền mặt nhưng đơn hàng đang chờ phát hành (Trạng thái: ${
                      successOrder.status || 'PENDING'
                    }).`}
              </p>
              <div className="text-xs">
                Mã đơn bán vé:{' '}
                <strong className="font-mono text-[var(--gt-ink)]">
                  {successOrder.orderNumber || successOrder.id || successOrder.orderId}
                </strong>
              </div>

              {successOrder.receipt && (
                <div className="max-w-md mx-auto p-4 bg-white rounded-2xl border border-[var(--gt-border)] text-xs space-y-2 text-left shadow-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--gt-muted)]">Biên nhận thu tiền:</span>
                    <strong className="font-mono text-[var(--gt-ink)]">
                      {successOrder.receipt.receiptNo}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gt-muted)]">Số tiền đã thu:</span>
                    <MoneyText
                      amount={successOrder.receipt.amount}
                      weight="bold"
                      variant="coral"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gt-muted)]">Trạng thái đơn:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isIssued
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {successOrder.status}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  In vé & Biên lai
                </Button>
                <Button
                  onClick={() => setSuccessOrder(null)}
                  className="bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-xl"
                >
                  Bán vé cho khách tiếp theo
                </Button>
              </div>
            </SurfaceCard>
          );
        })()
      ) : pendingCashOrder ? (
        /* Step 2: Awaiting physical cash confirmation card */
        <SurfaceCard className="bg-amber-50/50 border border-amber-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Bước 2 / 2: Thu tiền mặt tại quầy
              </span>
              <h2 className="text-base font-bold text-amber-950">
                Đơn hàng đã giữ chỗ (Mã: {pendingCashOrder.orderNumber || pendingCashOrder.id || pendingCashOrder.orderId})
              </h2>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-amber-900 font-medium">Khách hàng:</span>
              <strong className="text-amber-950">{customerName} - {customerPhone}</strong>
            </div>
            <div className="flex items-center justify-between text-base pt-2 border-t border-amber-100">
              <span className="font-bold text-amber-900">Tổng tiền mặt cần nhận:</span>
              <MoneyText
                amount={
                  pendingCashOrder.totalPrice ||
                  pendingCashOrder.totalAmount ||
                  totalAmount.toNumber()
                }
                size="xl"
                weight="extrabold"
                variant="coral"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              disabled={receivingCash || cancellingUnpaid}
              onClick={handleReceiveCashPayment}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-xs font-bold"
            >
              {receivingCash ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang ghi nhận biên lai...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Xác nhận đã nhận đủ tiền mặt
                </>
              )}
            </Button>

            <Button
              variant="outline"
              disabled={receivingCash || cancellingUnpaid}
              onClick={() => setIsCancelConfirmOpen(true)}
              className="border-amber-300 text-amber-900 hover:bg-amber-100 rounded-xl"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Hủy giữ chỗ
            </Button>
          </div>
        </SurfaceCard>
      ) : (
        /* Regular Counter Sales Form (Step 1) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Trip selector & Seat map */}
          <div className="lg:col-span-7 space-y-5">
            <SurfaceCard className="p-5 space-y-3">
              <label className="block text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider">
                Chọn chuyến xe vận hành
              </label>
              {loadingTrips ? (
                <div className="py-4 text-xs text-[var(--gt-muted)] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--gt-coral)]" />
                  <span>Đang tải các chuyến xe...</span>
                </div>
              ) : trips.length === 0 ? (
                <p className="text-xs text-[var(--gt-muted)]">Chưa có chuyến xe nào đang mở bán.</p>
              ) : (
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[var(--gt-border)] rounded-2xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] font-semibold outline-none"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.route ? `${t.route.origin} ➔ ${t.route.destination}` : 'Chuyến xe'} (
                      {new Date(t.departureTime).toLocaleString('vi-VN')}) - {t.car?.name || 'Xe khách'}
                    </option>
                  ))}
                </select>
              )}
            </SurfaceCard>

            {/* Seat Map */}
            {loadingSeats ? (
              <SurfaceCard className="py-16 text-center">
                <LoadingState message="Đang tải sơ đồ ghế của chuyến..." />
              </SurfaceCard>
            ) : seats.length > 0 ? (
              <SurfaceCard className="p-5">
                <SeatMap
                  seats={seats}
                  selectedSeatIds={selectedSeatIds}
                  onToggleSeat={(seat) => handleToggleSeat(seat.id)}
                />
              </SurfaceCard>
            ) : selectedTripId ? (
              <SurfaceCard className="p-8 text-center text-xs text-[var(--gt-muted)]">
                Chưa có cấu hình sơ đồ ghế cho chuyến này.
              </SurfaceCard>
            ) : null}
          </div>

          {/* Right Column (5 cols): Stops and Checkout Form */}
          <SurfaceCard className="lg:col-span-5 p-6 space-y-5">
            <h2 className="font-bold text-base text-[var(--gt-ink)] border-b border-[var(--gt-border)] pb-3">
              Thông tin bán vé tại quầy
            </h2>

            <form onSubmit={handleCashCheckout} className="space-y-4">
              {/* Stops Selection */}
              <div className="space-y-3 p-4 bg-[var(--gt-canvas)] rounded-2xl border border-[var(--gt-border)]">
                <h3 className="text-xs font-bold text-[var(--gt-ink)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--gt-coral)]" />
                  Điểm đón & Điểm trả thực tế
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--gt-muted)] mb-1">
                    Điểm đón khách <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedPickupStopId}
                    onChange={(e) => setSelectedPickupStopId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[var(--gt-border)] rounded-xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] outline-none font-medium"
                  >
                    {pickupStops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.address ? `(${s.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--gt-muted)] mb-1">
                    Điểm trả khách <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedDropoffStopId}
                    onChange={(e) => setSelectedDropoffStopId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[var(--gt-border)] rounded-xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] outline-none font-medium"
                  >
                    {dropoffStops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.address ? `(${s.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Passenger Info */}
              <div>
                <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1">
                  Họ và tên hành khách <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="VD: Trần Văn B"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--gt-border)] rounded-xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1">
                  Số điện thoại <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--gt-border)] rounded-xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--gt-ink)] mb-1">
                  Email (tùy chọn)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Để trống sẽ dùng email quầy"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--gt-border)] rounded-xl focus:border-[var(--gt-coral)] text-[var(--gt-ink)] outline-none font-medium"
                />
              </div>

              {/* Order Summary */}
              <div className="pt-2 border-t border-[var(--gt-border)] space-y-2 text-xs">
                <div className="flex justify-between text-[var(--gt-muted)]">
                  <span>Ghế đang chọn ({selectedSeats.length}):</span>
                  <strong className="text-[var(--gt-ink)]">
                    {selectedSeats.length > 0
                      ? selectedSeats.map((s) => s.code).join(', ')
                      : 'Chưa chọn'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-bold text-[var(--gt-ink)]">Tổng tiền thu mặt:</span>
                  <MoneyText
                    amount={totalAmount.toNumber()}
                    size="lg"
                    weight="extrabold"
                    variant="coral"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || selectedSeats.length === 0}
                className="w-full py-3 bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs font-bold rounded-2xl shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Đang tạo đơn giữ chỗ...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5 mr-2" />
                    Tiến hành thu tiền mặt ({formatVnd(totalAmount.toString())})
                  </>
                )}
              </Button>
            </form>
          </SurfaceCard>
        </div>
      )}

      {/* Confirm cancel unpaid modal */}
      <ConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Xác nhận hủy đơn giữ chỗ"
        description="Bạn có chắc chắn muốn hủy đơn giữ chỗ này và giải phóng ghế cho khách khác tiếp tục đặt?"
        confirmLabel="Hủy giữ chỗ"
        cancelLabel="Đóng"
        variant="danger"
        onConfirm={handleConfirmCancelUnpaidOrder}
      />
    </div>
  );
};
