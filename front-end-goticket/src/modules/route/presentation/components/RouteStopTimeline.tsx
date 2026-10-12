import React from "react";
import type { RouteStopEntity } from "../../domain/entity/route.entity";
import { Navigation, Flag } from "lucide-react";

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
      <p className="text-xs text-gray-400 italic py-2">
        Chưa có thông tin trạm dừng.
      </p>
    );
  }

  const total = sortedStops.length;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative pl-7 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-gray-200">
        {sortedStops.map((stop, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === total - 1;
          const isIntermediate = !isFirst && !isLast;

          return (
            <div key={stop.id || idx} className="relative pb-4 last:pb-0">
              {/* Icon Marker */}
              <div
                className={`absolute -left-7 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white ${
                  isFirst
                    ? "border-[#FF385C] text-[#FF385C] shadow-2xs"
                    : isLast
                    ? "border-[#111827] text-[#111827] shadow-2xs"
                    : "border-gray-300 text-gray-400"
                }`}
              >
                {isFirst ? (
                  <Navigation className="h-3 w-3 fill-[#FF385C]" />
                ) : isLast ? (
                  <Flag className="h-3 w-3 fill-[#111827]" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                )}
              </div>

              {/* Stop Information */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold ${
                      isFirst
                        ? "text-[#FF385C]"
                        : isLast
                        ? "text-[#111827]"
                        : "text-gray-800"
                    }`}
                  >
                    {stop.name}
                  </span>
                  {isFirst && (
                    <span className="border border-[#FF385C]/20 bg-[#FFF0F2] text-[10px] font-bold text-[#FF385C] px-2 py-0.5 rounded-full">
                      Bến xuất phát
                    </span>
                  )}
                  {isLast && (
                    <span className="border border-gray-200 bg-gray-100 text-[10px] font-bold text-[#111827] px-2 py-0.5 rounded-full">
                      Bến trả khách
                    </span>
                  )}
                  {isIntermediate && (
                    <span className="text-[10px] text-gray-400">
                      (Đón/trả dọc đường)
                    </span>
                  )}
                </div>

                <span className="font-mono text-[10px] text-gray-400 sm:text-right">
                  Trạm #{stop.order}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
