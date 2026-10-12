import React from "react";
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
  Bus,
} from "lucide-react";
import { MoneyText } from "@/shared/presentation/components/data-display/MoneyText";

interface CustomerTripCardProps {
  trip: CustomerTripEntity;
  onViewDetail: (trip: CustomerTripEntity) => void;
  onSelectTrip: (trip: CustomerTripEntity) => void;
}

export const CustomerTripCard: React.FC<CustomerTripCardProps> = ({
  trip,
  onViewDetail,
  onSelectTrip,
}) => {
  const isSoldOut = trip.isSoldOut();
  const availableSeats = trip.getAvailableSeats();

  return (
    <div className="group overflow-hidden rounded-[24px] border border-gray-200/90 bg-white shadow-2xs transition-all hover:border-[#FF385C]/40 hover:shadow-md">
      <div className="p-5 sm:p-6">
        {/* Card Header: Operator & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center justify-center font-bold">
              <Bus className="w-4 h-4 text-[#FF385C]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] leading-snug">
                {trip.operator.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Đối tác KYC
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 font-medium">
                  {trip.car.name} ({trip.car.licensePlate})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
              {trip.getCarTypeLabel()}
            </span>

            {isSoldOut ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                Hết vé
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 tabular-nums">
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
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827] tabular-nums block">
                  {trip.getDepartureTimeOnly()}
                </span>
                <span className="block max-w-[150px] truncate text-xs font-bold text-gray-700 sm:max-w-[180px] mt-0.5">
                  {trip.getStartStopName()}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {trip.route.origin}
                </span>
              </div>

              {/* Journey Duration Bar */}
              <div className="flex flex-col items-center px-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#FF385C] tabular-nums">
                  <Clock className="h-3 w-3" />
                  {trip.getDurationText()}
                </span>
                <div className="relative my-2 flex w-24 sm:w-32 items-center">
                  <div className="h-2 w-2 rounded-full bg-[#FF385C] ring-4 ring-[#FFF0F2]" />
                  <div className="h-0.5 w-full bg-gray-200" />
                  <div className="h-2 w-2 rounded-full bg-[#111827]" />
                </div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Chạy thẳng
                </span>
              </div>

              {/* Arrival */}
              <div>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827] tabular-nums block">
                  {trip.getArrivalTimeOnly()}
                </span>
                <span className="block max-w-[150px] truncate text-xs font-bold text-gray-700 sm:max-w-[180px] mt-0.5">
                  {trip.getEndStopName()}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {trip.route.destination}
                </span>
              </div>
            </div>

            {/* Quick Route Summary */}
            <div className="flex items-center space-x-2 pt-1 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-[#FF385C] shrink-0" />
              <span className="truncate">
                Lộ trình chính: <strong className="text-gray-800">{trip.getSummaryRoute()}</strong>
              </span>
            </div>
          </div>

          {/* Pricing & CTA Button (5 cols) */}
          <div className="flex flex-col justify-between border-t border-gray-100 pt-3.5 lg:col-span-5 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pt-0 lg:pl-6">
            <div className="lg:text-right">
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Giá vé từ
              </span>
              <div className="mt-0.5">
                <MoneyText amount={trip.pricePerSeat} size="2xl" variant="coral" />
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
                className="h-10 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-full px-4"
              >
                <span>Xem trạm dừng</span>
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                disabled={isSoldOut}
                onClick={() => onSelectTrip(trip)}
                className={`h-10 px-6 rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  isSoldOut
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-[#FF385C] text-white hover:bg-[#E61E4F] glow-coral-sm active:scale-95"
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
