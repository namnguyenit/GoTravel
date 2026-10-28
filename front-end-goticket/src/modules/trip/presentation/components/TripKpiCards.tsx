import React from "react";
import type { TripKpiStats } from "../../application/port/trip.service.interface";
import { CalendarClock, Clock, CheckCircle2, XCircle, Bus } from "lucide-react";
import { MetricCard } from "@/shared/presentation/components";

interface TripKpiCardsProps {
  kpi: TripKpiStats;
  loading?: boolean;
}

export const TripKpiCards: React.FC<TripKpiCardsProps> = ({
  kpi,
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
      <MetricCard
        label="Số chuyến trong ngày"
        value={loading ? "..." : kpi.totalTrips.toLocaleString("vi-VN")}
        icon={Bus}
        variant="default"
      />
      <MetricCard
        label="Sắp khởi hành"
        value={loading ? "..." : kpi.scheduledTrips.toLocaleString("vi-VN")}
        icon={CalendarClock}
        variant="coral"
      />
      <MetricCard
        label="Đã đến giờ khởi hành"
        value={loading ? "..." : kpi.departedTrips.toLocaleString("vi-VN")}
        icon={Clock}
        variant="coral"
      />
      <MetricCard
        label="Đã hoàn thành"
        value={loading ? "..." : kpi.completedTrips.toLocaleString("vi-VN")}
        icon={CheckCircle2}
        variant="emerald"
      />
      <MetricCard
        label="Đã hủy chuyến"
        value={loading ? "..." : kpi.cancelledTrips.toLocaleString("vi-VN")}
        icon={XCircle}
        variant="default"
      />
    </div>
  );
};
