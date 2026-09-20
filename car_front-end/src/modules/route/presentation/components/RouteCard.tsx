import React, { useState } from "react";
import type { RouteEntity } from "../../domain/entity/route.entity";
import { RouteStopTimeline } from "./RouteStopTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  index,
  onToggleStatus,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const startStop = route.getStartStop();
  const endStop = route.getEndStop();
  const totalStops = route.getTotalStops();

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-xs transition-all ${
        route.isActive()
          ? "border-gray-200 hover:border-blue-200 hover:shadow-sm"
          : "border-zinc-200 bg-zinc-50/40 opacity-90"
      }`}
    >
      {/* Card Header & Main Info */}
      <div className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                route.isActive()
                  ? "bg-blue-50 text-blue-700"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              #{index}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {route.getSummaryRoute()}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${route.getStatusBadgeClasses()}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      route.isActive()
                        ? "animate-pulse bg-emerald-500"
                        : "bg-zinc-400"
                    }`}
                  />
                  {route.getStatusDisplayName()}
                </span>
              </div>
              <p className="font-mono text-[11px] text-gray-400">
                Mã tuyến: {route.id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className="border-indigo-200 bg-indigo-50 font-semibold text-indigo-700"
            >
              <Waypoints className="mr-1 h-3.5 w-3.5" />
              <span>{totalStops} trạm dừng</span>
            </Badge>

            <span className="flex items-center text-xs text-gray-500">
              <Calendar className="mr-1 h-3.5 w-3.5 text-gray-400" />
              <span>{route.getFormattedCreatedAt()}</span>
            </span>
          </div>
        </div>

        {/* Quick Station Summary */}
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-2">
          {/* Start Station */}
          <div className="flex items-center space-x-2">
            <Navigation className="h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                Bến xuất phát
              </span>
              <span className="truncate text-xs font-medium text-gray-800">
                {startStop ? startStop.name : "N/A"}
              </span>
            </div>
          </div>

          {/* End Station */}
          <div className="flex items-center space-x-2">
            <Flag className="h-4 w-4 flex-shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                Bến đích
              </span>
              <span className="truncate text-xs font-medium text-gray-800">
                {endStop ? endStop.name : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Route Stops Timeline Section */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-5">
          <h4 className="mb-3 text-xs font-bold tracking-wider text-gray-600 uppercase">
            Chi tiết lộ trình hành trình ({totalStops} trạm)
          </h4>
          <RouteStopTimeline stops={route.stops} />
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-5 py-2.5">
        <div>
          {onToggleStatus && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(route)}
              className={`h-8 text-xs font-semibold transition-colors ${
                route.isActive()
                  ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              {route.isActive() ? (
                <>
                  <Lock className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                  <span>Tạm khóa tuyến</span>
                </>
              ) : (
                <>
                  <Unlock className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  <span>Mở khóa tuyến</span>
                </>
              )}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-8 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <span>
            {expanded
              ? "Thu gọn lộ trình"
              : `Xem chi tiết lộ trình (${totalStops} trạm)`}
          </span>
          {expanded ? (
            <ChevronUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
};
