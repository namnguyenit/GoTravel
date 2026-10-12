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
      className={`overflow-hidden rounded-[28px] border backdrop-blur-xl transition-all duration-300 ${
        route.isActive()
          ? "border-white/80 bg-white/85 shadow-glass hover:shadow-glass-lg hover:border-[#FF385C]/40"
          : "border-white/60 bg-white/60 opacity-80 shadow-2xs"
      }`}
    >
      {/* Card Header & Main Info */}
      <div className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <span
              className={`flex h-8 px-3 items-center justify-center rounded-full font-mono text-xs font-bold ${
                route.isActive()
                  ? "bg-coral-soft text-[#FF385C] border border-[#FF385C]/20"
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
            >
              #{index}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {route.getSummaryRoute()}
                </h3>
                <StatusBadge status={route.isActive() ? "ACTIVE" : "INACTIVE"} />
              </div>
              <p className="font-mono text-[11px] text-gray-400">
                Mã tuyến: {route.id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-2xs px-3.5 py-1 text-xs font-bold text-gray-700">
              <Waypoints className="h-3.5 w-3.5 text-[#FF385C]" />
              <span>{totalStops} trạm dừng</span>
            </span>

            <span className="flex items-center text-xs font-medium text-gray-500">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              <span>{route.getFormattedCreatedAt()}</span>
            </span>
          </div>
        </div>

        {/* Quick Station Summary */}
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 p-3.5 sm:grid-cols-2">
          {/* Start Station */}
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-soft text-[#FF385C]">
              <Navigation className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Bến xuất phát
              </span>
              <span className="truncate text-xs font-bold text-gray-900">
                {startStop ? startStop.name : "N/A"}
              </span>
            </div>
          </div>

          {/* End Station */}
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
              <Flag className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Bến đến
              </span>
              <span className="truncate text-xs font-bold text-gray-900">
                {endStop ? endStop.name : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Route Stops Timeline Section */}
      {expanded && (
        <div className="border-t border-gray-100/80 bg-white/40 backdrop-blur-md p-5">
          <h4 className="mb-3 text-xs font-bold tracking-wider text-gray-900 uppercase">
            Chi tiết lộ trình hành trình ({totalStops} trạm)
          </h4>
          <RouteStopTimeline stops={route.stops} />
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between border-t border-gray-100/80 bg-white/70 backdrop-blur-md px-5 py-3 rounded-b-[28px]">
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(route)}
              className="rounded-full border border-gray-200/80 bg-white/90 px-4 py-1.5 text-xs font-bold text-gray-700 hover:border-[#FF385C] hover:text-[#FF385C] shadow-2xs transition cursor-pointer"
            >
              Sửa lộ trình
            </button>
          )}
          {onToggleStatus && (
            <button
              type="button"
              onClick={() => onToggleStatus(route)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
                route.isActive()
                  ? "border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100/80"
                  : "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80"
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
          className="text-xs font-bold text-[#FF385C] hover:text-[#E61E4F] inline-flex items-center gap-1 transition cursor-pointer"
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
