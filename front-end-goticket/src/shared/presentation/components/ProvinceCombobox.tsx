import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";

import { provinceKey } from "@/shared/utils/vietnam-province";
import { PROVINCES } from "@/shared/constants/provinces";
export const VIETNAM_PROVINCES: readonly string[] = PROVINCES;

export interface ProvinceComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  excludeProvince?: string;
  className?: string;
  id?: string;
}

const normalizeStr = provinceKey;

export const ProvinceCombobox: React.FC<ProvinceComboboxProps> = ({
  label,
  value,
  onChange,
  placeholder = "Chọn tỉnh / thành phố...",
  disabled = false,
  required = false,
  error,
  excludeProvince = "",
  className = "",
  id,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Tìm tỉnh đã chọn trong danh sách chuẩn hóa
  const selectedProvince = useMemo(() => {
    if (!value) return "";
    const norm = normalizeStr(value);
    const found = VIETNAM_PROVINCES.find((p) => normalizeStr(p) === norm);
    return found || value;
  }, [value]);

  // Danh sách các tỉnh khả dụng (đã loại trừ tỉnh loại trừ nếu có)
  const availableProvinces = useMemo(() => {
    const normExclude = normalizeStr(excludeProvince);
    return VIETNAM_PROVINCES.filter((p) => {
      if (normExclude && normalizeStr(p) === normExclude) return false;
      return true;
    });
  }, [excludeProvince]);

  // Lọc theo search term
  const filteredProvinces = useMemo(() => {
    const normSearch = normalizeStr(searchTerm);
    if (!normSearch) return availableProvinces;
    return availableProvinces.filter((p) =>
      normalizeStr(p).includes(normSearch)
    );
  }, [availableProvinces, searchTerm]);

  // Đóng khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus ô tìm kiếm khi mở popup
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (province: string) => {
    onChange(province);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase tracking-wider"
        >
          <MapPin className="h-3.5 w-3.5 text-[#FF385C]" />
          <span>{label}</span>
          {required && <span className="text-[#FF385C]">*</span>}
        </label>
      )}

      {/* Main trigger button */}
      <div
        id={inputId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-xs transition cursor-pointer select-none shadow-2xs ${
          disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : error
            ? "border-rose-400 ring-2 ring-rose-200"
            : isOpen
            ? "border-[#FF385C] ring-2 ring-[#FF385C]/20 shadow-xs"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin
            className={`h-3.5 w-3.5 shrink-0 ${
              selectedProvince ? "text-[#FF385C]" : "text-gray-400"
            }`}
          />
          {selectedProvince ? (
            <span className="font-semibold text-gray-900 truncate">
              {selectedProvince}
            </span>
          ) : (
            <span className="text-gray-400 font-normal truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedProvince && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              title="Xóa lựa chọn"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
              isOpen ? "rotate-180 text-[#FF385C]" : ""
            }`}
          />
        </div>
      </div>

      {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}

      {/* Dropdown Menu - GIỚI HẠN HIỂN THỊ 5 ITEMS CÓ THANH CUỘN */}
      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search box inside dropdown */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ để lọc tỉnh / thành phố..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50/80 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[#FF385C] focus:bg-white focus:ring-1 focus:ring-[#FF385C]"
            />
          </div>

          {/* List items - Max height 185px (tương đương 5 dòng item), overflow-y-auto */}
          <div className="max-h-[185px] overflow-y-auto space-y-0.5 pr-1 divide-y divide-gray-50 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {filteredProvinces.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">
                Không tìm thấy tỉnh nào phù hợp
              </div>
            ) : (
              filteredProvinces.map((province) => {
                const isSelected =
                  normalizeStr(province) === normalizeStr(selectedProvince);

                return (
                  <button
                    key={province}
                    type="button"
                    onClick={() => handleSelect(province)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? "bg-[#FFF0F2] text-[#FF385C] font-bold"
                        : "text-gray-700 hover:bg-gray-100/80"
                    }`}
                  >
                    <span className="truncate">{province}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-[#FF385C] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note: Số lượng tỉnh và hướng dẫn cuộn */}
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 px-1">
            <span>Hiển thị 5 mục/khung (cuộn xem thêm)</span>
            <span className="font-semibold text-gray-500">
              {filteredProvinces.length} / 63 tỉnh
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
