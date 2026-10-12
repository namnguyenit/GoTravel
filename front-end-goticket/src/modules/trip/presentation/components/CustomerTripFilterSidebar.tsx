import React from "react";
import { Filter, RotateCcw, Clock, Bus, DollarSign, Check } from "lucide-react";

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
  className?: string;
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
  { value: "UNDER_200K", label: "Dưới 200.000 ₫" },
  { value: "200K_350K", label: "200.000 ₫ - 350.000 ₫" },
  { value: "OVER_350K", label: "Trên 350.000 ₫" },
];

export const CustomerTripFilterSidebar: React.FC<
  CustomerTripFilterSidebarProps
> = ({ filters, onChange, onReset, totalResults, className = "" }) => {
  const hasActiveFilters = Boolean(
    filters.carType || filters.timeRange || filters.priceRange
  );

  return (
    <div
      className={`space-y-6 rounded-[24px] border border-gray-200/80 bg-white p-5 shadow-2xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFF0F2] text-[#FF385C] flex items-center justify-center">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">Bộ lọc tìm kiếm</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-bold text-[#FF385C] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Đặt lại
          </button>
        )}
      </div>

      {/* Car Type Filter */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
          <Bus className="h-3.5 w-3.5 text-[#FF385C]" />
          Loại xe khách
        </label>
        <div className="space-y-1">
          {CAR_TYPES.map((type) => {
            const isSelected = filters.carType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange({ ...filters, carType: type.value })}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#FFF0F2] text-[#FF385C] font-bold shadow-2xs"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{type.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#FF385C]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="space-y-2.5 border-t border-gray-100 pt-4">
        <label className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
          <Clock className="h-3.5 w-3.5 text-[#FF385C]" />
          Giờ xuất bến
        </label>
        <div className="space-y-1">
          {TIME_RANGES.map((tr) => {
            const isSelected = filters.timeRange === tr.value;
            return (
              <button
                key={tr.value}
                type="button"
                onClick={() => onChange({ ...filters, timeRange: tr.value })}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#FFF0F2] text-[#FF385C] font-bold shadow-2xs"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{tr.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#FF385C]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2.5 border-t border-gray-100 pt-4">
        <label className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
          <DollarSign className="h-3.5 w-3.5 text-[#FF385C]" />
          Mức giá vé
        </label>
        <div className="space-y-1">
          {PRICE_RANGES.map((pr) => {
            const isSelected = filters.priceRange === pr.value;
            return (
              <button
                key={pr.value}
                type="button"
                onClick={() => onChange({ ...filters, priceRange: pr.value })}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#FFF0F2] text-[#FF385C] font-bold shadow-2xs"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{pr.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#FF385C]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Stats Footer */}
      <div className="border-t border-gray-100 pt-3 text-center text-xs text-gray-400">
        Tìm thấy <strong className="text-gray-900 font-bold tabular-nums">{totalResults}</strong>{" "}
        chuyến xe phù hợp
      </div>
    </div>
  );
};
