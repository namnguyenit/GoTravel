import React from "react";
import { Filter, RotateCcw, Clock, Bus, DollarSign } from "lucide-react";

export interface CustomerTripFilters {
  carType: string;
  timeRange: string;
  priceRange: string;
}

interface CustomerTripFilterSidebarProps {
  filters: CustomerTripFilters;
  onChange: (newFilters: CustomerTripFilters) => void;
  onReset: () => void;
  totalResults: number;
}

const CAR_TYPES = [
  { value: "", label: "Tất cả loại xe" },
  { value: "LIMOUSINE", label: "Limousine VIP" },
  { value: "SLEEPER", label: "Giường nằm" },
  { value: "SEAT", label: "Ghế ngồi" },
];

const TIME_RANGES = [
  { value: "", label: "Tất cả khung giờ" },
  { value: "EARLY_MORNING", label: "Sáng sớm (00:00 - 06:00)" },
  { value: "MORNING", label: "Buổi sáng (06:00 - 12:00)" },
  { value: "AFTERNOON", label: "Buổi chiều (12:00 - 18:00)" },
  { value: "EVENING", label: "Buổi tối (18:00 - 24:00)" },
];

const PRICE_RANGES = [
  { value: "", label: "Tất cả mức giá" },
  { value: "UNDER_200K", label: "Dưới 200.000 đ" },
  { value: "200K_350K", label: "200.000 đ - 350.000 đ" },
  { value: "OVER_350K", label: "Trên 350.000 đ" },
];

export const CustomerTripFilterSidebar: React.FC<
  CustomerTripFilterSidebarProps
> = ({ filters, onChange, onReset, totalResults }) => {
  const hasActiveFilters = Boolean(
    filters.carType || filters.timeRange || filters.priceRange
  );

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Bộ lọc tìm kiếm</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
          >
            <RotateCcw className="h-3 w-3" />
            Đặt lại
          </button>
        )}
      </div>

      {/* Car Type Filter */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-600 uppercase">
          <Bus className="h-3.5 w-3.5 text-indigo-600" />
          Loại xe khách
        </label>
        <div className="space-y-1.5">
          {CAR_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                filters.carType === type.value
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{type.label}</span>
              <input
                type="radio"
                name="carTypeFilter"
                checked={filters.carType === type.value}
                onChange={() => onChange({ ...filters, carType: type.value })}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="space-y-2.5 border-t border-gray-100 pt-4">
        <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-600 uppercase">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          Giờ xuất bến
        </label>
        <div className="space-y-1.5">
          {TIME_RANGES.map((tr) => (
            <label
              key={tr.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                filters.timeRange === tr.value
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{tr.label}</span>
              <input
                type="radio"
                name="timeRangeFilter"
                checked={filters.timeRange === tr.value}
                onChange={() => onChange({ ...filters, timeRange: tr.value })}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2.5 border-t border-gray-100 pt-4">
        <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-600 uppercase">
          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          Mức giá vé
        </label>
        <div className="space-y-1.5">
          {PRICE_RANGES.map((pr) => (
            <label
              key={pr.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                filters.priceRange === pr.value
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{pr.label}</span>
              <input
                type="radio"
                name="priceRangeFilter"
                checked={filters.priceRange === pr.value}
                onChange={() => onChange({ ...filters, priceRange: pr.value })}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Filter Stats Footer */}
      <div className="border-t border-gray-100 pt-3 text-center text-xs text-gray-400">
        Tìm thấy <strong className="text-gray-900">{totalResults}</strong>{" "}
        chuyến xe phù hợp
      </div>
    </div>
  );
};
