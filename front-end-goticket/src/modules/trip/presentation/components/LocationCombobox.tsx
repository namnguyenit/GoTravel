import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Search, X, PlaneTakeoff } from "lucide-react";

type LocationTone = "origin" | "destination";

interface LocationComboboxProps {
  label: string;
  value: string;
  locations: string[];
  loading: boolean;
  placeholder: string;
  tone: LocationTone;
  excludedLocation?: string;
  error?: string;
  labelAction?: React.ReactNode;
  variant?: "default" | "capsule";
  onChange: (value: string) => void;
}

const normalizeLocation = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi")
    .trim();

const toneStyles: Record<
  LocationTone,
  { icon: string; selected: string; check: string; focus: string }
> = {
  origin: {
    icon: "text-[#1A1D20]",
    selected: "border-[var(--gt-brand)]/30 bg-[var(--gt-brand-soft)] text-[var(--gt-brand)]",
    check: "text-[var(--gt-brand)]",
    focus: "border-[var(--gt-brand)] ring-[var(--gt-brand)]/20",
  },
  destination: {
    icon: "text-[var(--gt-brand)]",
    selected: "border-[var(--gt-brand)]/30 bg-[var(--gt-brand-soft)] text-[var(--gt-brand)]",
    check: "text-[var(--gt-brand)]",
    focus: "border-[var(--gt-brand)] ring-[var(--gt-brand)]/20",
  },
};

export const LocationCombobox: React.FC<LocationComboboxProps> = ({
  label,
  value,
  locations,
  loading,
  placeholder,
  tone,
  excludedLocation = "",
  error,
  labelAction,
  variant = "default",
  onChange,
}) => {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const styles = toneStyles[tone];

  const deduplicatedLocations = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) {
      const trimmed = loc.trim();
      if (!trimmed) continue;
      const key = normalizeLocation(trimmed);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, trimmed);
      } else {
        const existingUpper = (existing.match(/[A-ZÀ-Ỹ]/g) || []).length;
        const currentUpper = (trimmed.match(/[A-ZÀ-Ỹ]/g) || []).length;
        if (currentUpper > existingUpper) {
          map.set(key, trimmed);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "vi"));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const normalizedValue = normalizeLocation(value);
    const normalizedExcluded = normalizeLocation(excludedLocation);
    const available = deduplicatedLocations.filter(
      (location) => normalizeLocation(location) !== normalizedExcluded
    );
    const isSelectedValue = available.some(
      (location) => normalizeLocation(location) === normalizedValue
    );

    if (!normalizedValue || isSelectedValue) return available;

    const searchTokens = normalizedValue.split(/\s+/).filter(Boolean);
    return available.filter((location) => {
      const normalizedLocation = normalizeLocation(location);
      return searchTokens.every((token) => normalizedLocation.includes(token));
    });
  }, [deduplicatedLocations, excludedLocation, value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = filteredLocations.findIndex(
      (location) => normalizeLocation(location) === normalizeLocation(value)
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredLocations, isOpen, value]);

  const selectLocation = (location: string) => {
    onChange(location);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((current) =>
        filteredLocations.length > 0
          ? (current + 1) % filteredLocations.length
          : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((current) =>
        filteredLocations.length > 0
          ? (current - 1 + filteredLocations.length) % filteredLocations.length
          : 0
      );
    } else if (event.key === "Enter" && isOpen && filteredLocations.length) {
      event.preventDefault();
      selectLocation(filteredLocations[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full ${isOpen ? "z-40" : "z-10"}`}>
      {variant !== "capsule" && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <label
            htmlFor={`${listboxId}-input`}
            className="block text-xs font-bold tracking-wider text-gray-500 uppercase"
          >
            {label}
          </label>
          {labelAction}
        </div>
      )}

      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex cursor-pointer items-center transition-all ${
          variant === "capsule"
            ? `h-14 px-5 rounded-full input-pill-island gap-3 ${
                error
                  ? "ring-2 ring-red-400 bg-red-50/40"
                  : isOpen
                    ? "ring-2 ring-[var(--gt-brand)]/30 bg-white shadow-md"
                    : "bg-white/95 hover:bg-white"
              }`
            : `rounded-xl border bg-gray-50/70 px-3 py-2.5 gap-2.5 ${
                error
                  ? "border-red-400 bg-red-50/20 ring-2 ring-red-100"
                  : isOpen
                    ? `${styles.focus} bg-white ring-2`
                    : "border-gray-200 hover:border-gray-300"
              }`
        }`}
      >
        {loading ? (
          <Loader2 className={`h-5 w-5 shrink-0 animate-spin ${styles.icon}`} />
        ) : variant === "capsule" && tone === "origin" ? (
          <PlaneTakeoff className="h-5 w-5 shrink-0 text-gray-700" />
        ) : (
          <MapPin className={`h-5 w-5 shrink-0 ${variant === "capsule" ? "text-gray-700" : styles.icon}`} />
        )}
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && filteredLocations[activeIndex]
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Đang tải địa điểm..." : placeholder}
          className={`min-w-0 flex-1 bg-transparent outline-none ${
            variant === "capsule"
              ? "text-base font-semibold text-[#111827] placeholder:font-normal placeholder:text-gray-400"
              : "text-sm font-semibold text-gray-900 placeholder:font-medium placeholder:text-gray-400"
          }`}
        />

        {value && (
          <button
            type="button"
            aria-label={`Xóa ${label.toLocaleLowerCase("vi")}`}
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {variant !== "capsule" && (
          <button
            type="button"
            aria-label={`${isOpen ? "Đóng" : "Mở"} danh sách ${label.toLocaleLowerCase("vi")}`}
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 absolute top-full left-0 z-50 mt-2.5 w-full min-w-[320px] overflow-hidden rounded-[28px] border border-white/80 bg-white/95 backdrop-blur-2xl p-2.5 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-[270px] overflow-y-auto space-y-0.5 pr-0.5"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className={`h-4 w-4 animate-spin ${styles.icon}`} />
                <span>Đang tải danh sách địa điểm...</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="px-4 py-7 text-center">
                <MapPin className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">
                  Chưa tải được danh sách địa điểm
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Bạn vẫn có thể nhập địa điểm để tìm chuyến.
                </p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="px-4 py-7 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">
                  Không tìm thấy “{value.trim()}”
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Thử tên tỉnh, thành phố khác hoặc kiểm tra lại chính tả.
                </p>
              </div>
            ) : (
              <div className="flex flex-col space-y-0.5">
                {filteredLocations.map((location, index) => {
                  const isSelected =
                    normalizeLocation(location) === normalizeLocation(value);
                  const isActive = index === activeIndex;
                  return (
                    <button
                      id={`${listboxId}-option-${index}`}
                      key={location}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectLocation(location)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[var(--gt-brand-soft)] text-[var(--gt-brand)]"
                          : isActive
                            ? "bg-gray-100/80 text-gray-900"
                            : "text-[#111827] hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[var(--gt-brand-soft-hover)] text-[var(--gt-brand)]"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="truncate font-semibold text-sm sm:text-[15px]">
                          {location}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-[var(--gt-brand)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      )}
    </div>
  );
};
