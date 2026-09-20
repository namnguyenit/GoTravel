import React from "react";
import type { TripEntity } from "../../domain/entity/trip.entity";
import {
  type TripStatus,
  TRIP_STATUS,
} from "../../domain/value-object/trip-status.vo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Bus,
  Users,
  Waypoints,
  Play,
  CheckCircle2,
  Ban,
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

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-all hover:border-blue-200 hover:shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 font-mono text-xs font-bold text-blue-700">
              #{index}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {trip.getSummaryRoute()}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${trip.getStatusBadgeClasses()}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      trip.isScheduled()
                        ? "animate-pulse bg-blue-500"
                        : trip.isDeparted()
                          ? "animate-pulse bg-amber-500"
                          : trip.isCompleted()
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                    }`}
                  />
                  {trip.getStatusDisplayName()}
                </span>
              </div>
              <p className="font-mono text-[11px] text-gray-400">
                Mã chuyến: {trip.id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <span className="block text-[11px] font-medium text-gray-400 uppercase">
                Giá vé cơ bản
              </span>
              <span className="text-base font-extrabold text-blue-600">
                {trip.getFormattedPrice()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main details grid */}
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Schedule & Time */}
        <div className="space-y-2 rounded-lg bg-gray-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-gray-700">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Lịch trình vận hành
            </span>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {trip.getDurationText()}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Xuất bến:</span>
              <span className="font-semibold text-gray-800">
                {trip.getFormattedDepartureTime()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Đến nơi:</span>
              <span className="font-semibold text-gray-800">
                {trip.getFormattedArrivalTime()}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="space-y-2 rounded-lg bg-gray-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-gray-700">
              <Bus className="h-3.5 w-3.5 text-indigo-600" />
              Xe khách phục vụ
            </span>
            <Badge
              variant="outline"
              className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
            >
              {trip.car?.type || "Xe khách"}
            </Badge>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Tên xe:</span>
              <span className="max-w-[130px] truncate font-medium text-gray-800">
                {trip.car?.name || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Biển số:</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-bold text-gray-900">
                {trip.car?.licensePlate || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Occupancy / Seat Booking */}
        <div className="space-y-2 rounded-lg bg-gray-50/70 p-3.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-gray-700">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              Tình trạng đặt vé
            </span>
            <span className="text-xs font-bold text-gray-800">
              {trip.getOccupancyText()}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Tỷ lệ lấp đầy:</span>
              <span className="font-semibold text-emerald-700">
                {occupancyRate.toFixed(1)}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-2.5 border-t border-gray-100 bg-gray-50/70 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[11px] text-gray-400">
            Chuyến: {trip.id}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Route Detail Button */}
          {onViewRouteDetail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewRouteDetail(trip)}
              className="h-8 border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-700"
            >
              <Waypoints className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              <span>Xem chi tiết tuyến</span>
            </Button>
          )}

          {/* State Machine Status Transition Actions */}
          {onRequestUpdateStatus && trip.canDepart() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.DEPARTED)}
              className="h-8 border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:text-amber-900"
            >
              <Play className="mr-1.5 h-3 w-3 fill-amber-700 text-amber-700" />
              <span>Xuất bến</span>
            </Button>
          )}

          {onRequestUpdateStatus && trip.canComplete() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.COMPLETED)}
              className="h-8 border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 hover:text-emerald-900"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              <span>Hoàn thành chuyến</span>
            </Button>
          )}

          {onRequestUpdateStatus && trip.canCancel() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.CANCELLED)}
              className="h-8 border-rose-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
              <span>Hủy chuyến</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
