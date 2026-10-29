import { OperatorLogo } from "@/shared/presentation/components/operator/OperatorLogo";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { tripService } from "../../composition";
import { bookingService } from "@/modules/booking/composition";
import type { TransportCheckoutPayload } from "@/modules/booking/application/port/booking.service.interface";
import type {
  TripPublicDetail,
  TripStopItem,
} from "../../application/port/trip.service.interface";
import type { SeatEntity } from "../../domain/entity/seat.entity";
import { SeatMap } from "../components/SeatMap";
import { CancellationPolicyNotice } from "@/modules/booking/presentation/components/CancellationPolicyNotice";
import {
  PassengerForm,
  type PassengerInput,
} from "../components/PassengerForm";
import { useAuth } from "@/modules/auth/presentation/context/AuthContext";
import { MoneyVo, formatVnd } from "@/shared/domain/money.vo";
import {
  canPickupAt,
  canDropoffAt,
  isValidStopPair,
  orderedTripStops,
} from "../../domain/value-object/trip-stops";
import { ApiError } from "@/shared/infrastructure/http/HttpPort";
import {
  stableCommand,
  clearStableCommand,
} from "@/shared/infrastructure/storage/stable-command";
import {
  MapPin,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Clock,
  Bus,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { CustomerPageContainer } from "@/shared/presentation/components/layout/CustomerPageContainer";
import { LoadingState } from "@/shared/presentation/components/feedback/LoadingState";
import { ErrorState } from "@/shared/presentation/components/feedback/ErrorState";
import { MoneyText } from "@/shared/presentation/components/data-display/MoneyText";

export const TripDetailPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, login, loading: sessionLoading } = useAuth();

  const [trip, setTrip] = useState<TripPublicDetail | null>(null);
  const [seats, setSeats] = useState<SeatEntity[]>([]);
  const [stops, setStops] = useState<TripStopItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection states
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Record<string, PassengerInput>>(
    {}
  );

  // Contact Info
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stable idempotency key for this draft intent

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
              : "Không thể tải thông tin chuyến xe hoặc sơ đồ ghế."
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
              setSubmitError(
                "Một hoặc nhiều ghế bạn chọn vừa được người khác giữ chỗ hoặc đặt mua."
              );
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
      const pickupStops = orderedTripStops(stops).filter(canPickupAt);
      const dropoffStops = orderedTripStops(stops).filter(canDropoffAt);
      setPassengers((prev) => ({
        ...prev,
        [seat.id]: {
          seatId: seat.id,
          name:
            contactName ||
            (selectedSeatIds.length === 0 ? user?.fullName || "" : ""),
          pickupStopId: pickupStops[0]?.id || "",
          dropoffStopId: dropoffStops[dropoffStops.length - 1]?.id || "",
        },
      }));
      setSubmitError(null);
    }
  };

  // Handle passenger detail changes
  const handlePassengerChange = (
    seatId: string,
    updated: Partial<PassengerInput>
  ) => {
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
    if (!trip || selectedSeats.length === 0 || submitting) return;

    // Check login
    if (!user) {
      login(`/trips/${tripId}`);
      return;
    }

    // Validation
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setSubmitError(
        "Vui lòng điền đầy đủ họ tên, email và số điện thoại người nhận vé."
      );
      return;
    }

    for (const seat of selectedSeats) {
      const p = passengers[seat.id];
      if (!p || !p.name.trim()) {
        setSubmitError(`Vui lòng nhập họ tên hành khách cho ghế ${seat.code}.`);
        return;
      }
      if (!isValidStopPair(stops, p.pickupStopId, p.dropoffStopId)) {
        setSubmitError(
          `Ghế ${seat.code}: điểm trả phải nằm sau điểm đón trên lộ trình.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Call API to reserve seats and checkout order
      const payload: TransportCheckoutPayload = {
        tripId: trip.id,
        fullName: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        passengers: selectedSeats.map((seat) => ({
          seatId: seat.id,
          name: passengers[seat.id].name.trim(),
          pickupStopId: passengers[seat.id].pickupStopId,
          dropoffStopId: passengers[seat.id].dropoffStopId,
        })),
      };

      const scope = `checkout:${user.id}:${trip.id}`;
      const order = await bookingService.checkout(
        stableCommand(scope, payload),
        payload
      );
      const orderId = order.orderId;
      if (!orderId) {
        throw new Error("Máy chủ không trả về mã đơn hàng sau khi giữ chỗ.");
      }

      clearStableCommand(scope);
      navigate(`/checkout/${orderId}`);
    } catch (err: unknown) {
      // Keep the key after a timeout/5xx: the server may already have created the order.
      if (
        err instanceof ApiError &&
        err.status >= 400 &&
        err.status < 500 &&
        ![408, 429].includes(err.status)
      ) {
        clearStableCommand(`checkout:${user.id}:${trip.id}`);
      }
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Giữ chỗ không thành công. Ghế có thể đã có người khác chọn."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || sessionLoading) {
    return (
      <CustomerPageContainer className="py-16">
        <LoadingState
          count={3}
          message="Đang tải sơ đồ ghế thời gian thực..."
        />
      </CustomerPageContainer>
    );
  }

  if (error || !trip) {
    return (
      <CustomerPageContainer className="py-16">
        <ErrorState
          title="Không thể tải chuyến xe"
          error={error || "Chuyến xe không tồn tại hoặc đã ngừng bán."}
          onRetry={() => window.location.reload()}
        />
      </CustomerPageContainer>
    );
  }

  return (
    <CustomerPageContainer className="space-y-6 pb-20">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="transition-colors hover:text-gray-900">
          Trang chủ
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/search" className="transition-colors hover:text-gray-900">
          Tìm chuyến
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-bold text-gray-800">
          {trip.route.origin} → {trip.route.destination}
        </span>
      </div>

      {/* Trip Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-md backdrop-blur-xl sm:p-7">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-editorial text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
              {trip.route.origin} → {trip.route.destination}
            </h1>
            <span className="rounded-full border border-gray-200/60 bg-white/80 px-3.5 py-1 text-xs font-bold text-gray-700 shadow-2xs backdrop-blur-xs">
              {trip.vehicle?.type || "Xe khách"}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:text-sm">
            <OperatorLogo
              src={trip.operator?.logoUrl}
              name={trip.operator?.name || "Nhà xe đối tác"}
              className="h-12 w-12"
            />
            <span>
              Nhà xe:{" "}
              <strong className="font-bold text-gray-800">
                {trip.operator?.name || "Nhà xe đối tác"}
              </strong>
            </span>
            {trip.vehicle?.name && (
              <>
                <span>•</span>
                <span>
                  Xe: {trip.vehicle.name} ({trip.vehicle.licensePlate})
                </span>
              </>
            )}
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 shadow-2xs">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Đã xác thực
              KYC
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Giá vé từ
            </span>
            <div className="mt-0.5">
              <MoneyText
                amount={trip.fromPriceVnd}
                size="2xl"
                variant="coral"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (8 cols) & Right Sticky Column (4 cols) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Stops & Schedule Card */}
          <div className="space-y-4 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur-md sm:p-7">
            <h3 className="flex items-center gap-2 text-base font-bold text-[#111827]">
              <MapPin className="h-4 w-4 text-[var(--gt-brand)]" />
              Lộ trình và các trạm dừng
            </h3>

            <div className="relative space-y-4 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-gray-200 before:content-['']">
              {stops.map((stop, idx) => (
                <div key={stop.id || idx} className="relative text-sm">
                  <div className="absolute top-1.5 -left-6 h-3.5 w-3.5 rounded-full border-2 border-[var(--gt-brand)] bg-white" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{stop.name}</span>
                    {stop.plannedAt && (
                      <span className="text-xs font-semibold text-gray-500 tabular-nums">
                        {new Date(stop.plannedAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {stop.address && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {stop.address}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Seat Map */}
          <div>
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-[#111827]">
                Chọn vị trí ghế ngồi
              </h3>
              <span className="text-xs text-gray-500">
                Đã chọn:{" "}
                <strong className="font-black text-[var(--gt-brand)] tabular-nums">
                  {selectedSeatIds.length}
                </strong>{" "}
                / 10 ghế
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
          <CancellationPolicyNotice />
          <PassengerForm
            selectedSeats={selectedSeats}
            passengers={passengers}
            stops={stops}
            origin={trip?.route.origin}
            destination={trip?.route.destination}
            onChangePassenger={handlePassengerChange}
          />
        </div>

        {/* Right Sticky Summary Column */}
        <div className="sticky top-24 space-y-4 lg:col-span-4">
          <form
            onSubmit={handleProceedToCheckout}
            className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-md backdrop-blur-xl sm:p-7"
          >
            <h3 className="border-b border-gray-100 pb-3 text-base font-bold text-[#111827]">
              Tóm tắt chuyến đi
            </h3>

            {/* Selected Seats Listing */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span>Tuyến xe</span>
                <span className="font-bold text-gray-900">
                  {trip.route.origin} → {trip.route.destination}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Số ghế đã chọn</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {selectedSeats.length} ghế
                </span>
              </div>

              {selectedSeats.length > 0 && (
                <div className="space-y-1.5 border-t border-gray-100 pt-2">
                  {selectedSeats.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-500">
                        Ghế {s.code} (Tầng {s.deck})
                      </span>
                      <MoneyText
                        amount={s.priceVnd.toString()}
                        size="xs"
                        variant="ink"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buyer Contact Input */}
            <div className="space-y-3 border-t border-gray-100 pt-3">
              <h4 className="text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
                Thông tin người nhận vé
              </h4>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-full border border-gray-200/80 bg-white/80 px-4 py-2 text-xs font-medium text-gray-900 transition-all focus:border-[var(--gt-brand)] focus:bg-white focus:outline-hidden sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Email nhận vé điện tử <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full rounded-full border border-gray-200/80 bg-white/80 px-4 py-2 text-xs font-medium text-gray-900 transition-all focus:border-[var(--gt-brand)] focus:bg-white focus:outline-hidden sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full rounded-full border border-gray-200/80 bg-white/80 px-4 py-2 text-xs font-medium text-gray-900 transition-all focus:border-[var(--gt-brand)] focus:bg-white focus:outline-hidden sm:text-sm"
                />
              </div>
            </div>

            {/* Total Fare & Status */}
            <div className="space-y-1 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Tổng tạm tính</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Chưa giữ chỗ
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-gray-900">
                  Thành tiền
                </span>
                <MoneyText
                  amount={totalAmount.toString()}
                  size="2xl"
                  variant="coral"
                />
              </div>
              <p className="pt-1 text-[11px] leading-relaxed text-gray-400">
                * Ghế được giữ 15 phút thời gian thực sau khi bạn bấm tiếp tục
                đặt vé.
              </p>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span className="leading-relaxed font-medium">
                  {submitError}
                </span>
              </div>
            )}

            {/* CTA Button */}
            <button
              type="submit"
              disabled={submitting || selectedSeats.length === 0}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 text-xs font-bold text-white shadow-xs transition-all sm:text-sm ${
                submitting || selectedSeats.length === 0
                  ? "cursor-not-allowed bg-gray-200 text-gray-400 shadow-none"
                  : "shadow-brand-sm bg-[var(--gt-brand)] hover:bg-[var(--gt-brand-hover)] active:scale-95"
              } `}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
        <div className="animate-in slide-in-from-bottom-4 fixed right-4 bottom-5 left-4 z-40 flex h-16 items-center justify-between rounded-full border border-white/85 bg-white/92 px-5 shadow-2xl backdrop-blur-2xl duration-200 lg:hidden">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500">
              Đã chọn{" "}
              <strong className="text-gray-900 tabular-nums">
                {selectedSeats.length}
              </strong>{" "}
              ghế
            </span>
            <MoneyText
              amount={totalAmount.toString()}
              size="sm"
              variant="coral"
            />
          </div>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={submitting}
            className="shadow-brand-sm flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--gt-brand)] px-5 text-xs font-bold text-white transition-all hover:bg-[var(--gt-brand-hover)]"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Tiếp tục</span>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </CustomerPageContainer>
  );
};
