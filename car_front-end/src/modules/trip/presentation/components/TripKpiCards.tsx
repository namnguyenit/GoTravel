import React from "react";
import type { TripKpiStats } from "../../application/port/trip.service.interface";
import { CalendarClock, Clock, CheckCircle2, XCircle, Bus } from "lucide-react";

interface TripKpiCardsProps {
  kpi: TripKpiStats;
  loading?: boolean;
}

export const TripKpiCards: React.FC<TripKpiCardsProps> = ({
  kpi,
  loading = false,
}) => {
  const cards = [
    {
      title: "Tổng số chuyến",
      value: kpi.totalTrips,
      icon: Bus,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-100",
    },
    {
      title: "Sắp khởi hành",
      value: kpi.scheduledTrips,
      icon: CalendarClock,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      title: "Đang di chuyển",
      value: kpi.departedTrips,
      icon: Clock,
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      borderColor: "border-amber-100",
    },
    {
      title: "Đã hoàn thành",
      value: kpi.completedTrips,
      icon: CheckCircle2,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100",
    },
    {
      title: "Đã hủy chuyến",
      value: kpi.cancelledTrips,
      icon: XCircle,
      bgColor: "bg-rose-50",
      textColor: "text-rose-600",
      borderColor: "border-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`flex items-center justify-between rounded-xl border ${card.borderColor} bg-white p-4 shadow-xs`}
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-gray-500">
                {card.title}
              </span>
              <div className={`mt-1 text-2xl font-bold ${card.textColor}`}>
                {loading ? (
                  <div className="h-7 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  card.value.toLocaleString("vi-VN")
                )}
              </div>
            </div>
            <div
              className={`shrink-0 rounded-lg p-2.5 ${card.bgColor} ${card.textColor}`}
            >
              <IconComponent className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
