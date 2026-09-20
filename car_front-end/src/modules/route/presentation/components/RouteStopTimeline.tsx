import React from "react";
import type { RouteStopEntity } from "../../domain/entity/route.entity";
import { Navigation, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RouteStopTimelineProps {
  stops: RouteStopEntity[];
  className?: string;
}

export const RouteStopTimeline: React.FC<RouteStopTimelineProps> = ({
  stops,
  className = "",
}) => {
  const sortedStops = [...stops].sort((a, b) => a.order - b.order);

  if (sortedStops.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        Chưa có thông tin trạm dừng.
      </p>
    );
  }

  const total = sortedStops.length;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative pl-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-gray-300 before:to-red-500">
        {sortedStops.map((stop, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === total - 1;
          const isIntermediate = !isFirst && !isLast;

          return (
            <div key={stop.id || idx} className="relative pb-3.5 last:pb-0">
              {/* Icon Marker */}
              <div
                className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white ${
                  isFirst
                    ? "border-blue-600 text-blue-600 shadow-xs"
                    : isLast
                      ? "border-red-600 text-red-600 shadow-xs"
                      : "border-gray-300 text-gray-400"
                }`}
              >
                {isFirst ? (
                  <Navigation className="h-3 w-3 fill-blue-600" />
                ) : isLast ? (
                  <Flag className="h-3 w-3 fill-red-600" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                )}
              </div>

              {/* Stop Information */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-semibold ${
                      isFirst
                        ? "text-blue-700"
                        : isLast
                          ? "text-red-700"
                          : "text-gray-800"
                    }`}
                  >
                    {stop.name}
                  </span>
                  {isFirst && (
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700"
                    >
                      Bến xuất phát
                    </Badge>
                  )}
                  {isLast && (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-[10px] font-bold text-red-700"
                    >
                      Bến đích
                    </Badge>
                  )}
                  {isIntermediate && (
                    <span className="text-[10px] text-gray-400">
                      (Trạm đón/trả dọc đường)
                    </span>
                  )}
                </div>

                <span className="font-mono text-[10px] text-gray-400 sm:text-right">
                  Thứ tự: #{stop.order}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
