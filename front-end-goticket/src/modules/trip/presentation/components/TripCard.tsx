import React from "react";
import { Link } from "react-router-dom";
import type { TripEntity } from "../../domain/entity/trip.entity";
import {
  type TripStatus,
  TRIP_STATUS,
} from "../../domain/value-object/trip-status.vo";
import {
  SurfaceCard,
  StatusBadge,
  MoneyText,
  IdText,
  Button,
} from "@/shared/presentation/components";
import {
  Clock,
  Bus,
  Users,
  Waypoints,
  Play,
  CheckCircle2,
  Ban,
  ArrowRight,
  Sliders,
} from "lucide-react";

interface TripCardProps {
  trip: TripEntity;
  index: number;
  onViewRouteDetail?: (trip: TripEntity) => void;
  onRequestUpdateStatus?: (trip: TripEntity, targetStatus: TripStatus) => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  index,
  onViewRouteDetail,
  onRequestUpdateStatus,
}) => {
  const occupancyRate = trip.getOccupancyRate();

  // Map trip status to StatusBadge status
  const badgeStatus: "SCHEDULED" | "DEPARTED" | "COMPLETED" | "CANCELLED" =
    trip.isScheduled()
      ? "SCHEDULED"
      : trip.isDeparted()
        ? "DEPARTED"
        : trip.isCompleted()
          ? "COMPLETED"
          : "CANCELLED";

  return (
    <SurfaceCard variant="glass" className="overflow-hidden p-0 rounded-[28px] border border-white/80 hover:border-[#FF385C]/50 hover:shadow-glass-lg transition-all duration-300">
      {/* Header */}
      <div className="border-b border-gray-100/80 p-4 sm:p-5 bg-white/70 backdrop-blur-md">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-soft font-mono text-xs font-bold text-[#FF385C] border border-[#FF385C]/20">
              #{index}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {trip.getSummaryRoute()}
                </h3>
                <StatusBadge status={badgeStatus} />
              </div>
              <div className="mt-0.5">
                <IdText id={trip.id} prefix="Chuyến" />
              </div>
            </div>
          </div>

          <div className="flex items-center sm:text-right">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Giá cơ bản
              </span>
              <MoneyText
                amount={trip.pricePerSeat}
                size="lg"
                weight="extrabold"
                variant="coral"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main details grid */}
      <div className="grid grid-cols-1 gap-3.5 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3 bg-white/40 backdrop-blur-md">
        {/* Schedule & Time */}
        <div className="space-y-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs p-3.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-gray-900">
              <Clock className="h-3.5 w-3.5 text-[#FF385C]" />
              Lịch trình
            </span>
            <span className="rounded-full bg-coral-soft px-2.5 py-0.5 text-[11px] font-bold text-[#FF385C]">
              {trip.getDurationText()}
            </span>
          </div>

          <div className="space-y-1 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Xuất bến:</span>
              <span className="font-bold text-gray-900">
                {trip.getFormattedDepartureTime()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Đến nơi:</span>
              <span className="font-bold text-gray-900">
                {trip.getFormattedArrivalTime()}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="space-y-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs p-3.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-gray-900">
              <Bus className="h-3.5 w-3.5 text-indigo-600" />
              Xe phục vụ
            </span>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              {trip.car?.type || "Xe khách"}
            </span>
          </div>

          <div className="space-y-1 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Tên xe:</span>
              <span className="max-w-[140px] truncate font-medium text-gray-900">
                {trip.car?.name || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Biển số:</span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-mono font-bold text-gray-900 text-[11px]">
                {trip.car?.licensePlate || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Occupancy / Seat Booking */}
        <div className="space-y-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-2xs p-3.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-gray-900">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              Tình trạng ghế
            </span>
            <span className="text-xs font-bold text-gray-900">
              {trip.getOccupancyText()}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Lấp đầy:</span>
              <span className="font-bold text-emerald-700">
                {occupancyRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-2.5 border-t border-gray-100/80 bg-white/70 backdrop-blur-md px-4 py-3 sm:flex-row sm:items-center sm:justify-between rounded-b-[28px]">
        <div className="flex items-center space-x-2">
          <Link
            to={`/operator/trips/${trip.id}/manage`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-coral-soft border border-[#FF385C]/20 px-3.5 text-xs font-bold text-[#FF385C] hover:bg-[#FF385C] hover:text-white transition-all shadow-2xs"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Vận hành & Giá ghế</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Route Detail Button */}
          {onViewRouteDetail && (
            <button
              type="button"
              onClick={() => onViewRouteDetail(trip)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/90 px-3.5 text-xs font-semibold text-gray-700 hover:border-[#FF385C] hover:text-[#FF385C] shadow-2xs transition cursor-pointer"
            >
              <Waypoints className="h-3.5 w-3.5 text-[#FF385C]" />
              <span>Lộ trình chi tiết</span>
            </button>
          )}

          {/* Lifecycle actions */}
          {onRequestUpdateStatus && trip.canDepart() && (
            <button
              type="button"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.DEPARTED)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/90 px-3.5 text-xs font-bold text-amber-800 hover:bg-amber-100 shadow-2xs transition cursor-pointer"
            >
              <Play className="h-3 w-3 fill-amber-700 text-amber-700" />
              <span>Xuất bến</span>
            </button>
          )}

          {onRequestUpdateStatus && trip.canComplete() && (
            <button
              type="button"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.COMPLETED)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/90 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Hoàn thành</span>
            </button>
          )}

          {onRequestUpdateStatus && trip.canCancel() && (
            <button
              type="button"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.CANCELLED)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-rose-200 bg-white/90 px-3.5 text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-2xs transition cursor-pointer"
            >
              <Ban className="h-3.5 w-3.5 text-rose-600" />
              <span>Hủy chuyến</span>
            </button>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
};
