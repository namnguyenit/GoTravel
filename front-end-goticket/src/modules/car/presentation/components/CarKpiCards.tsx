import React from "react";
import type { CarKpiMeta } from "../../application/port/car.service.interface";
import { MetricCard } from "@/shared/presentation/components";
import { Bus, BedDouble, Crown, Armchair } from "lucide-react";

interface CarKpiCardsProps {
  kpi: CarKpiMeta;
  loading?: boolean;
}

export const CarKpiCards: React.FC<CarKpiCardsProps> = ({ kpi, loading }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        label="Tổng số xe"
        value={loading ? "..." : kpi.totalCars.toLocaleString("vi-VN")}
        icon={Bus}
        variant="coral"
        subtext="Tất cả xe trong đội"
      />
      <MetricCard
        label="Xe giường nằm"
        value={loading ? "..." : kpi.sleeperCars.toLocaleString("vi-VN")}
        icon={BedDouble}
        subtext="Tiện nghi đường dài"
      />
      <MetricCard
        label="Xe Limousine"
        value={loading ? "..." : kpi.limousineCars.toLocaleString("vi-VN")}
        icon={Crown}
        variant="coral"
        subtext="Hạng sang cao cấp"
      />
      <MetricCard
        label="Xe ghế ngồi"
        value={loading ? "..." : kpi.seatCars.toLocaleString("vi-VN")}
        icon={Armchair}
        variant="emerald"
        subtext="Tuyến ngắn / trung"
      />
    </div>
  );
};
