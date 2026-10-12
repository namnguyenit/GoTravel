import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tripService } from '../../composition';
import type { TripPublicDetail, TripStopItem } from '../../application/port/trip.service.interface';
import type { SeatEntity } from '../../domain/entity/seat.entity';
import { SeatMap } from '../components/SeatMap';
import { PassengerForm, type PassengerInput } from '../components/PassengerForm';
import { useAuth } from '@/modules/auth/presentation/context/AuthContext';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { MoneyVo, formatVnd } from '@/shared/domain/money.vo';
import {
  MapPin,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Clock,
  Bus,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { CustomerPageContainer } from '@/shared/presentation/components/layout/CustomerPageContainer';
import { LoadingState } from '@/shared/presentation/components/feedback/LoadingState';
import { ErrorState } from '@/shared/presentation/components/feedback/ErrorState';
import { MoneyText } from '@/shared/presentation/components/data-display/MoneyText';

export const TripDetailPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [trip, setTrip] = useState<TripPublicDetail | null>(null);
  const [seats, setSeats] = useState<SeatEntity[]>([]);
  const [stops, setStops] = useState<TripStopItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection states
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Record<string, PassengerInput>>({});

  // Contact Info
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stable idempotency key for this draft intent
  const [idempotencyKey] = useState<string>(() => crypto.randomUUID());

  // Pre-fill contact info when user logs in
  useEffect(() => {
    if (user) {
      if (!contactName && user.fullName) setContactName(user.fullName);
      if (!contactEmail && user.email) setContactEmail(user.email);
      if (!contactPhone && user.phone) setContactPhone(user.phone);
    }
  }, [user]);

  // Fetch trip detail, seats, and stops
  useEffect(() => {
    if (!tripId) return;
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [tripDetail, seatList, stopList] = await Promise.all([
          tripService.getTripDetail(tripId),
          tripService.getTripSeats(tripId),
          tripService.getTripStops(tripId),
        ]);

        if (isMounted) {
          setTrip(tripDetail);
          setSeats(seatList);
          setStops(stopList.length > 0 ? stopList : tripDetail.stops || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin chuyến xe hoặc sơ đồ ghế.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    // Polling for seats every 10 seconds to update seat availability
    const seatPollInterval = setInterval(async () => {
      if (!isMounted || !tripId) return;
      try {
        const freshSeats = await tripService.getTripSeats(tripId);
        if (isMounted) {
          setSeats(freshSeats);
          // If a currently selected seat was booked/held by someone else, unselect it
          setSelectedSeatIds((currentSelected) => {
            const valid = currentSelected.filter((id) => {
              const s = freshSeats.find((seat) => seat.id === id);
              return s && s.isAvailable();
            });
            if (valid.length < currentSelected.length) {
              setSubmitError('Một hoặc nhiều ghế bạn chọn vừa được người khác giữ chỗ hoặc đặt mua.');
            }
            return valid;
          });
        }
      } catch {
        // Ignore polling transient errors
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(seatPollInterval);
    };
  }, [tripId]);

  // Selected Seat Entities
  const selectedSeats = useMemo(() => {
    return seats.filter((s) => selectedSeatIds.includes(s.id));
  }, [seats, selectedSeatIds]);

  // Total amount calculation
  const totalAmount = useMemo(() => {
    let total = MoneyVo.zero();
    for (const seat of selectedSeats) {
      total = total.add(seat.priceVnd);
    }
    return total;
  }, [selectedSeats]);

  // Handle seat click
  const handleToggleSeat = (seat: SeatEntity) => {
    if (selectedSeatIds.includes(seat.id)) {
      // Unselect
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
      setPassengers((prev) => {
        const copy = { ...prev };
        delete copy[seat.id];
        return copy;
      });
      setSubmitError(null);
    } else {
      // Select
      setSelectedSeatIds((prev) => [...prev, seat.id]);
      // Initialize passenger input with defaults
      const pickupStops = stops.filter((s) => s.pickupAllowed !== false);
      const dropoffStops = stops.filter((s) => s.dropoffAllowed !== false);
      setPassengers((prev) => ({
        ...prev,
        [seat.id]: {
          seatId: seat.id,
          name: contactName || (selectedSeatIds.length === 0 ? user?.fullName || '' : ''),
          pickupStopId: pickupStops[0]?.id || '',
          dropoffStopId: dropoffStops[dropoffStops.length - 1]?.id || '',
        },
      }));
      setSubmitError(null);
    }
  };

  // Handle passenger detail changes
  const handlePassengerChange = (seatId: string, updated: Partial<PassengerInput>) => {
    setPassengers((prev) => ({
      ...prev,
      [seatId]: {
        ...prev[seatId],
        ...updated,
      },
    }));
  };

  // Submit and hold seats
  const handleProceedToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || selectedSeats.length === 0) return;

    // Check login
    if (!user) {
      login(`/trips/${tripId}`);
      return;
    }

    // Validation
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setSubmitError('Vui lòng điền đầy đủ họ tên, email và số điện thoại người nhận vé.');
      return;
    }

    for (const seat of selectedSeats) {
      const p = passengers[seat.id];
      if (!p || !p.name.trim()) {
        setSubmitError(`Vui lòng nhập họ tên hành khách cho ghế ${seat.code}.`);
        return;
      }
      if (!p.pickupStopId || !p.dropoffStopId) {
        setSubmitError(`Vui lòng chọn điểm đón và điểm trả cho ghế ${seat.code}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Call API to hold seats and create order intent
      const payload = {
        tripId: trip.id,
        items: selectedSeats.map((seat) => ({
          seatId: seat.id,
          passengerName: passengers[seat.id].name.trim(),
          pickupStopId: passengers[seat.id].pickupStopId,
          dropoffStopId: passengers[seat.id].dropoffStopId,
        })),
        contactInfo: {
          fullName: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
        },
      };

      const res = await httpClient.post<{
        orderId: string;
        holdExpiresAt?: string;
        countdownSeconds?: number;
      }>(
        '/api/v1/orders/hold',
        payload,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      const orderId = res?.orderId;
      if (!orderId) {
        throw new Error('Máy chủ không trả về mã đơn hàng sau khi giữ chỗ.');
      }

      navigate(`/checkout/${orderId}`);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Giữ chỗ không thành công. Ghế có thể đã có người khác chọn.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CustomerPageContainer className="py-16">
        <LoadingState count={3} message="Đang tải sơ đồ ghế thời gian thực..." />
      </CustomerPageContainer>
    );
  }

  if (error || !trip) {
    return (
      <CustomerPageContainer className="py-16">
        <ErrorState
          title="Không thể tải chuyến xe"
          error={error || 'Chuyến xe không tồn tại hoặc đã ngừng bán.'}
          onRetry={() => window.location.reload()}
        />
      </CustomerPageContainer>
    );
  }

  return (
    <CustomerPageContainer className="space-y-6 pb-20">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-900 transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/search" className="hover:text-gray-900 transition-colors">Tìm chuyến</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-bold text-gray-800">
          {trip.route.origin} → {trip.route.destination}
        </span>
      </div>

      {/* Trip Header Banner */}
      <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 p-6 sm:p-7 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#111827] font-editorial tracking-tight">
              {trip.route.origin} → {trip.route.destination}
            </h1>
            <span className="px-3.5 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-gray-200/60 text-gray-700 text-xs font-bold shadow-2xs">
              {trip.vehicle?.type || 'Xe khách'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-2">
            <span>Nhà xe: <strong className="text-gray-800 font-bold">{trip.operator?.name || 'Nhà xe đối tác'}</strong></span>
            {trip.vehicle?.name && (
              <>
                <span>•</span>
                <span>Xe: {trip.vehicle.name} ({trip.vehicle.licensePlate})</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-500/20 px-2.5 py-0.5 rounded-full ml-1 shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã xác thực KYC
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Giá vé từ
            </span>
            <div className="mt-0.5">
              <MoneyText amount={trip.fromPriceVnd} size="2xl" variant="coral" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (8 cols) & Right Sticky Column (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stops & Schedule Card */}
          <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-white/80 p-6 sm:p-7 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#111827] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#FF385C]" />
              Lộ trình và các trạm dừng
            </h3>

            <div className="space-y-4 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {stops.map((stop, idx) => (
                <div key={stop.id || idx} className="relative text-sm">
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#FF385C]" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{stop.name}</span>
                    {stop.plannedAt && (
                      <span className="text-xs text-gray-500 tabular-nums font-semibold">
                        {new Date(stop.plannedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {stop.address && <p className="text-xs text-gray-400 mt-0.5">{stop.address}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Seat Map */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-base text-[#111827]">Chọn vị trí ghế ngồi</h3>
              <span className="text-xs text-gray-500">
                Đã chọn: <strong className="text-[#FF385C] font-black tabular-nums">{selectedSeatIds.length}</strong> / 10 ghế
              </span>
            </div>
            <SeatMap
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              maxSelectable={10}
              onToggleSeat={handleToggleSeat}
            />
          </div>

          {/* Passenger Information Form */}
          <PassengerForm
            selectedSeats={selectedSeats}
            passengers={passengers}
            stops={stops}
            onChangePassenger={handlePassengerChange}
          />
        </div>

        {/* Right Sticky Summary Column */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <form
            onSubmit={handleProceedToCheckout}
            className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 p-6 sm:p-7 space-y-5 shadow-md"
          >
            <h3 className="font-bold text-base text-[#111827] border-b border-gray-100 pb-3">
              Tóm tắt chuyến đi
            </h3>

            {/* Selected Seats Listing */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span>Tuyến xe</span>
                <span className="font-bold text-gray-900">{trip.route.origin} → {trip.route.destination}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Số ghế đã chọn</span>
                <span className="font-bold text-gray-900 tabular-nums">{selectedSeats.length} ghế</span>
              </div>

              {selectedSeats.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  {selectedSeats.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Ghế {s.code} (Tầng {s.deck})</span>
                      <MoneyText amount={s.priceVnd.toString()} size="xs" variant="ink" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buyer Contact Input */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                Thông tin người nhận vé
              </h4>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 text-xs sm:text-sm bg-white/80 border border-gray-200/80 rounded-full focus:outline-hidden focus:border-[#FF385C] focus:bg-white text-gray-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email nhận vé điện tử <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full px-4 py-2 text-xs sm:text-sm bg-white/80 border border-gray-200/80 rounded-full focus:outline-hidden focus:border-[#FF385C] focus:bg-white text-gray-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-4 py-2 text-xs sm:text-sm bg-white/80 border border-gray-200/80 rounded-full focus:outline-hidden focus:border-[#FF385C] focus:bg-white text-gray-900 transition-all font-medium"
                />
              </div>
            </div>

            {/* Total Fare & Status */}
            <div className="pt-3 border-t border-gray-100 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Tổng tạm tính</span>
                <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                  Chưa giữ chỗ
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-gray-900">Thành tiền</span>
                <MoneyText amount={totalAmount.toString()} size="2xl" variant="coral" />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                * Ghế được giữ 15 phút thời gian thực sau khi bạn bấm tiếp tục đặt vé.
              </p>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium leading-relaxed">{submitError}</span>
              </div>
            )}

            {/* CTA Button */}
            <button
              type="submit"
              disabled={submitting || selectedSeats.length === 0}
              className={`
                w-full py-3.5 rounded-full font-bold text-xs sm:text-sm text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer
                ${
                  submitting || selectedSeats.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-[#FF385C] hover:bg-[#E61E4F] glow-coral-sm active:scale-95'
                }
              `}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang giữ chỗ 15 phút...</span>
                </>
              ) : (
                <span>Tiếp tục đặt vé ({selectedSeats.length} ghế)</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Floating Panoramic Glass Capsule Summary Dock (Mobile Only) */}
      {selectedSeats.length > 0 && (
        <div className="lg:hidden fixed bottom-5 left-4 right-4 z-40 h-16 rounded-full bg-white/92 backdrop-blur-2xl border border-white/85 shadow-2xl px-5 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500">
              Đã chọn <strong className="text-gray-900 tabular-nums">{selectedSeats.length}</strong> ghế
            </span>
            <MoneyText amount={totalAmount.toString()} size="sm" variant="coral" />
          </div>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={submitting}
            className="h-10 px-5 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white text-xs font-bold glow-coral-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Tiếp tục</span>
            )}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </CustomerPageContainer>
  );
};
