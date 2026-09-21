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
} from "lucide-react";

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
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition-all hover:border-blue-300 hover:shadow-md">
      <div className="p-5">
        {/* Card Header: Operator & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-gray-900">
              {trip.operator.name}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              <ShieldCheck className="h-3 w-3 text-blue-600" />
              Chính hãng
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${trip.getCarTypeBadgeClasses()}`}
            >
              {trip.getCarTypeLabel()}
            </Badge>

            {isSoldOut ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                Hết vé
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
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
                <span className="text-2xl font-black tracking-tight text-gray-900">
                  {trip.getDepartureTimeOnly()}
                </span>
                <span className="block max-w-[150px] truncate text-xs font-semibold text-gray-600 sm:max-w-[180px]">
                  {trip.getStartStopName()}
                </span>
                <span className="mt-0.5 block text-[11px] text-gray-400">
                  {trip.route.origin}
                </span>
              </div>

              {/* Journey Duration Bar */}
              <div className="flex flex-col items-center px-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                  <Clock className="h-3 w-3" />
                  {trip.getDurationText()}
                </span>
                <div className="relative my-1.5 flex w-24 items-center sm:w-28">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-gray-300 to-red-500" />
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
                <span className="text-[10px] text-gray-400">Chạy thẳng</span>
              </div>

              {/* Arrival */}
              <div>
                <span className="text-2xl font-black tracking-tight text-gray-900">
                  {trip.getArrivalTimeOnly()}
                </span>
                <span className="block max-w-[150px] truncate text-xs font-semibold text-gray-600 sm:max-w-[180px]">
                  {trip.getEndStopName()}
                </span>
                <span className="mt-0.5 block text-[11px] text-gray-400">
                  {trip.route.destination}
                </span>
              </div>
            </div>

            {/* Quick Route Highlights */}
            <div className="flex items-center space-x-3 pt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-400" />
                Lộ trình: <strong>{trip.getSummaryRoute()}</strong>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Xe: {trip.car.name} ({trip.car.licensePlate})
              </span>
            </div>
          </div>

          {/* Pricing & CTA Button (5 cols) */}
          <div className="flex flex-col justify-between border-t border-gray-100 pt-3 lg:col-span-5 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pt-0 lg:pl-6">
            <div className="lg:text-right">
              <span className="block text-[11px] font-semibold text-gray-400 uppercase">
                Giá vé từ
              </span>
              <span className="text-2xl font-black tracking-tight text-blue-600">
                {trip.getFormattedPrice()}
              </span>
              <span className="mt-0.5 block text-[11px] text-gray-400">
                / ghế / lượt
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 lg:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onViewDetail(trip)}
                className="h-9 text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <span>Xem trạm dừng</span>
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                disabled={isSoldOut}
                onClick={() => onSelectTrip(trip)}
                className={`h-9 px-5 text-xs font-bold shadow-xs transition-all ${
                  isSoldOut
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
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
