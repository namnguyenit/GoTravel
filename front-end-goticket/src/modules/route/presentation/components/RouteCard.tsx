import React, { useState } from "react";
import type { RouteEntity } from "../../domain/entity/route.entity";
import { RouteStopTimeline } from "./RouteStopTimeline";
import { StatusBadge } from "@/shared/presentation/components";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Navigation,
  Flag,
  Waypoints,
  Lock,
  Unlock,
} from "lucide-react";

interface RouteCardProps {
  route: RouteEntity;
  index: number;
  onToggleStatus?: (route: RouteEntity) => void;
  onEdit?: (route: RouteEntity) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  index,
  onToggleStatus,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const startStop = route.getStartStop();
  const endStop = route.getEndStop();
  const totalStops = route.getTotalStops();

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-2xs transition-all ${
        route.isActive()
          ? "border-[var(--gt-border)] hover:border-[var(--gt-coral)]/40 hover:shadow-xs"
          : "border-[var(--gt-border)] bg-[var(--gt-surface-soft)] opacity-80"
      }`}
    >
      {/* Card Header & Main Info */}
      <div className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                route.isActive()
                  ? "bg-[var(--gt-coral-soft)] text-[var(--gt-coral)]"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              #{index}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[var(--gt-ink)]">
                  {route.getSummaryRoute()}
                </h3>
                <StatusBadge status={route.isActive() ? "ACTIVE" : "INACTIVE"} />
              </div>
              <p className="font-mono text-[11px] text-[var(--gt-muted)]">
                Mã tuyến: {route.id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gt-surface-soft)] border border-[var(--gt-border)] px-3 py-1 text-xs font-bold text-[var(--gt-ink)]">
              <Waypoints className="h-3.5 w-3.5 text-[var(--gt-coral)]" />
              <span>{totalStops} trạm dừng</span>
            </span>

            <span className="flex items-center text-xs text-[var(--gt-muted)]">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              <span>{route.getFormattedCreatedAt()}</span>
            </span>
          </div>
        </div>

        {/* Quick Station Summary */}
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-[var(--gt-surface-soft)] p-3.5 sm:grid-cols-2">
          {/* Start Station */}
          <div className="flex items-center space-x-2.5">
            <Navigation className="h-4 w-4 flex-shrink-0 text-[var(--gt-coral)]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold text-[var(--gt-muted)] uppercase tracking-wider">
                Bến xuất phát
              </span>
              <span className="truncate text-xs font-bold text-[var(--gt-ink)]">
                {startStop ? startStop.name : "N/A"}
              </span>
            </div>
          </div>

          {/* End Station */}
          <div className="flex items-center space-x-2.5">
            <Flag className="h-4 w-4 flex-shrink-0 text-[var(--gt-ink)]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold text-[var(--gt-muted)] uppercase tracking-wider">
                Bến đến
              </span>
              <span className="truncate text-xs font-bold text-[var(--gt-ink)]">
                {endStop ? endStop.name : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Route Stops Timeline Section */}
      {expanded && (
        <div className="border-t border-[var(--gt-border-soft)] bg-[var(--gt-surface-soft)]/50 p-5">
          <h4 className="mb-3 text-xs font-bold tracking-wider text-[var(--gt-ink)] uppercase">
            Chi tiết lộ trình hành trình ({totalStops} trạm)
          </h4>
          <RouteStopTimeline stops={route.stops} />
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between border-t border-[var(--gt-border-soft)] bg-[var(--gt-surface-soft)]/80 px-5 py-3">
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(route)}
              className="rounded-xl border border-[var(--gt-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--gt-ink)] hover:border-[var(--gt-coral)] hover:text-[var(--gt-coral)] transition"
            >
              Sửa lộ trình
            </button>
          )}
          {onToggleStatus && (
            <button
              type="button"
              onClick={() => onToggleStatus(route)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition ${
                route.isActive()
                  ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {route.isActive() ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Tạm khóa tuyến</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mở khóa tuyến</span>
                </>
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold text-[var(--gt-coral)] hover:underline inline-flex items-center gap-1"
        >
          <span>
            {expanded
              ? "Thu gọn lộ trình"
              : `Xem chi tiết lộ trình (${totalStops} trạm)`}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
