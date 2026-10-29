import React from "react";
import { OperatorLogo } from "@/shared/presentation/components/operator/OperatorLogo";
import type { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ShieldCheck,
  ChevronRight,
  Users,
  MapPin,
  Check,
} from "lucide-react";
import { TripTimeVO } from "../../domain/value-object/trip-time.vo";
import { MoneyText } from "@/shared/presentation/components/data-display/MoneyText";

interface CustomerTripCardProps {
  trip: CustomerTripEntity;
  showDepartureDate?: boolean;
  onViewDetail: (trip: CustomerTripEntity) => void;
  onSelectTrip: (trip: CustomerTripEntity) => void;
}

export const CustomerTripCard: React.FC<CustomerTripCardProps> = ({
  trip,
  showDepartureDate = false,
  onViewDetail,
  onSelectTrip,
}) => {
  const isSoldOut = trip.isSoldOut();
  const availableSeats = trip.getAvailableSeats();

  return (
    <div className="group overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-2xs backdrop-blur-md transition-all hover:border-[var(--gt-brand)]/40 hover:bg-white/92 hover:shadow-lg">
      <div className="p-5 sm:p-6">
        {/* Card Header: Operator & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100/80 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <OperatorLogo
              src={trip.operator.logoUrl}
              name={trip.operator.name}
              className="h-12 w-12"
            />
            <div>
              <h3 className="text-base leading-snug font-bold text-[#111827]">
                {trip.operator.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-2xs">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Đối tác KYC
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs font-medium text-gray-500">
                  {trip.car.name} ({trip.car.licensePlate})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="rounded-full border border-gray-200/60 bg-white/80 px-3 py-1 text-xs font-bold text-gray-700 shadow-2xs backdrop-blur-xs">
              {trip.getCarTypeLabel()}
            </span>

            {isSoldOut ? (
              <span className="rounded-full border border-rose-300/60 bg-rose-50/80 px-3 py-1 text-xs font-bold text-rose-700 shadow-2xs">
                Hết vé
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-700 tabular-nums shadow-2xs backdrop-blur-xs">
                <Users className="h-3 w-3" />
                Còn {availableSeats} chỗ
              </span>
            )}
          </div>
        </div>

        {/* Card Body: Schedule & Stops */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
          {/* Time & Timeline (7 cols) */}
          <div className="space-y-3 lg:col-span-7">
            <div className="flex items-center justify-between sm:justify-start sm:space-x-8">
              {/* Departure */}
              <div>
                <span className="block text-2xl font-black tracking-tight text-[#111827] tabular-nums sm:text-3xl">
                  {trip.getDepartureTimeOnly()}
                </span>
                {showDepartureDate && (
                  <time
                    dateTime={trip.departureTime}
                    aria-label="Ngày khởi hành"
                    className="mt-1 block text-xs font-semibold text-gray-700 tabular-nums"
                  >
                    {trip.getDepartureDateOnly()}
                  </time>
                )}
                <span className="mt-0.5 block max-w-[150px] truncate text-xs font-bold text-gray-700 sm:max-w-[180px]">
                  {trip.getStartStopName()}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {trip.route.origin}
                </span>
              </div>

              {/* Journey Duration Bar */}
              <div className="flex flex-col items-center px-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--gt-brand)] tabular-nums">
                  <Clock className="h-3 w-3" />
                  {trip.getDurationText()}
                </span>
                <div className="relative my-2 flex w-24 items-center sm:w-32">
                  <div className="h-2 w-2 rounded-full bg-[var(--gt-brand)] ring-4 ring-[var(--gt-brand-soft)]" />
                  <div className="h-0.5 w-full bg-gray-200" />
                  <div className="h-2 w-2 rounded-full bg-[#111827]" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Chạy thẳng
                </span>
              </div>

              {/* Arrival */}
              <div>
                <span className="block text-2xl font-black tracking-tight text-[#111827] tabular-nums sm:text-3xl">
                  {trip.getArrivalTimeOnly()}
                </span>
                {showDepartureDate && (
                  <time
                    dateTime={trip.arrivalTime}
                    aria-label="Ngày đến"
                    className="mt-1 block text-xs font-semibold text-gray-700 tabular-nums"
                  >
                    {TripTimeVO.formatDate(trip.arrivalTime)}
                  </time>
                )}
                <span className="mt-0.5 block max-w-[150px] truncate text-xs font-bold text-gray-700 sm:max-w-[180px]">
                  {trip.getEndStopName()}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {trip.route.destination}
                </span>
              </div>
            </div>

            {/* Quick Route Summary */}
            <div className="flex items-center space-x-2 pt-1 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--gt-brand)]" />
              <span className="truncate">
                Lộ trình chính:{" "}
                <strong className="text-gray-800">
                  {trip.getSummaryRoute()}
                </strong>
              </span>
            </div>
          </div>

          {/* Pricing & CTA Button (5 cols) */}
          <div className="flex flex-col justify-between border-t border-gray-100 pt-3.5 lg:col-span-5 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pt-0 lg:pl-6">
            <div className="lg:text-right">
              <span className="block text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                Giá vé từ
              </span>
              <div className="mt-0.5">
                <MoneyText
                  amount={trip.pricePerSeat}
                  size="2xl"
                  variant="coral"
                />
              </div>
              <span className="mt-0.5 block text-[11px] text-gray-400">
                / hành khách / lượt
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 lg:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onViewDetail(trip)}
                className="h-10 rounded-full px-4 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                <span>Xem trạm dừng</span>
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                disabled={isSoldOut}
                onClick={() => onSelectTrip(trip)}
                className={`h-10 cursor-pointer rounded-full px-6 text-xs font-bold shadow-xs transition-all ${
                  isSoldOut
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "shadow-brand-sm bg-[var(--gt-brand)] text-white hover:bg-[var(--gt-brand-hover)] active:scale-95"
                }`}
              >
                {isSoldOut ? (
                  <span>Hết chỗ</span>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    <span>Chọn chuyến</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
