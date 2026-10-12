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
    <SurfaceCard className="overflow-hidden p-0 border border-[var(--gt-border)] hover:border-[var(--gt-coral)] transition-all">
      {/* Header */}
      <div className="border-b border-[var(--gt-border)] p-4 sm:p-5 bg-white">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--gt-coral-soft)] font-mono text-xs font-bold text-[var(--gt-coral)]">
              #{index}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[var(--gt-ink)]">
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
              <span className="block text-[11px] font-semibold text-[var(--gt-muted)] uppercase tracking-wider">
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
      <div className="grid grid-cols-1 gap-3.5 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3 bg-[var(--gt-canvas)]">
        {/* Schedule & Time */}
        <div className="space-y-2 rounded-2xl bg-white border border-[var(--gt-border)] p-3.5">
          <div className="flex items-center justify-between text-xs text-[var(--gt-muted)]">
            <span className="flex items-center gap-1 font-semibold text-[var(--gt-ink)]">
              <Clock className="h-3.5 w-3.5 text-[var(--gt-coral)]" />
              Lịch trình
            </span>
            <span className="rounded-full bg-[var(--gt-coral-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--gt-coral)]">
              {trip.getDurationText()}
            </span>
          </div>

          <div className="space-y-1 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--gt-muted)]">Xuất bến:</span>
              <span className="font-bold text-[var(--gt-ink)]">
                {trip.getFormattedDepartureTime()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--gt-muted)]">Đến nơi:</span>
              <span className="font-bold text-[var(--gt-ink)]">
                {trip.getFormattedArrivalTime()}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="space-y-2 rounded-2xl bg-white border border-[var(--gt-border)] p-3.5">
          <div className="flex items-center justify-between text-xs text-[var(--gt-muted)]">
            <span className="flex items-center gap-1 font-semibold text-[var(--gt-ink)]">
              <Bus className="h-3.5 w-3.5 text-indigo-600" />
              Xe phục vụ
            </span>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {trip.car?.type || "Xe khách"}
            </span>
          </div>

          <div className="space-y-1 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--gt-muted)]">Tên xe:</span>
              <span className="max-w-[140px] truncate font-medium text-[var(--gt-ink)]">
                {trip.car?.name || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--gt-muted)]">Biển số:</span>
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono font-bold text-[var(--gt-ink)]">
                {trip.car?.licensePlate || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Occupancy / Seat Booking */}
        <div className="space-y-2 rounded-2xl bg-white border border-[var(--gt-border)] p-3.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-[var(--gt-muted)]">
            <span className="flex items-center gap-1 font-semibold text-[var(--gt-ink)]">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              Tình trạng ghế
            </span>
            <span className="text-xs font-bold text-[var(--gt-ink)]">
              {trip.getOccupancyText()}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-[var(--gt-muted)]">
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
      <div className="flex flex-col gap-2.5 border-t border-[var(--gt-border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <Link
            to={`/operator/trips/${trip.id}/manage`}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--gt-coral-soft)] px-3 text-xs font-bold text-[var(--gt-coral)] hover:bg-[var(--gt-coral)] hover:text-white transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Vận hành & Giá ghế</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Route Detail Button */}
          {onViewRouteDetail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewRouteDetail(trip)}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              <Waypoints className="mr-1.5 h-3.5 w-3.5 text-[var(--gt-coral)]" />
              <span>Lộ trình chi tiết</span>
            </Button>
          )}

          {/* Lifecycle actions */}
          {onRequestUpdateStatus && trip.canDepart() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.DEPARTED)}
              className="h-8 border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-xl"
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
              className="h-8 border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded-xl"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              <span>Hoàn thành</span>
            </Button>
          )}

          {onRequestUpdateStatus && trip.canCancel() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUpdateStatus(trip, TRIP_STATUS.CANCELLED)}
              className="h-8 border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
              <span>Hủy chuyến</span>
            </Button>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
};
