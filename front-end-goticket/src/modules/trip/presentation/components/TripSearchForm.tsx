import React, { useEffect, useState } from "react";
import { ArrowLeftRight, Calendar, Search, Sparkles, Armchair, Bus } from "lucide-react";
import { TripSearchQueryVO } from "../../domain/value-object/trip-search-query.vo";
import { tripService } from "../../composition";
import { LocationCombobox } from "./LocationCombobox";
import { DatePickerPopover } from "./DatePickerPopover";

interface TripSearchFormProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialDate?: string;
  onSearch: (criteria: {
    origin: string;
    destination: string;
    departureDate: string;
  }) => void;
  compact?: boolean;
}

export const TripSearchForm: React.FC<TripSearchFormProps> = ({
  initialOrigin = "",
  initialDestination = "",
  initialDate = "",
  onSearch,
  compact = false,
}) => {
  const todayStr = TripSearchQueryVO.getTodayDateString();
  const tomorrowStr = TripSearchQueryVO.getTomorrowDateString();
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [departureDate, setDepartureDate] = useState(initialDate || todayStr);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => setOrigin(initialOrigin), [initialOrigin]);
  useEffect(() => setDestination(initialDestination), [initialDestination]);
  useEffect(
    () => setDepartureDate(initialDate || todayStr),
    [initialDate, todayStr]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        const result = await tripService.getLocations();
        if (isMounted) setLocations(result);
      } catch {
        if (isMounted) setLocations([]);
      } finally {
        if (isMounted) setLoadingLocations(false);
      }
    };

    void fetchLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  const clearLocationErrors = (field: "origin" | "destination") => {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      delete next.match;
      return next;
    });
  };

  const handleOriginChange = (value: string) => {
    setOrigin(value);
    if (errors.origin || errors.match) clearLocationErrors("origin");
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    if (errors.destination || errors.match) clearLocationErrors("destination");
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setErrors((current) => {
      const next = { ...current };
      delete next.origin;
      delete next.destination;
      delete next.match;
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = TripSearchQueryVO.validate({
      origin,
      destination,
      departureDate,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onSearch({
      origin: origin.trim(),
      destination: destination.trim(),
      departureDate: departureDate.trim(),
    });
  };

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl lg:rounded-full bg-white border border-gray-200/90 shadow-sm p-2 sm:p-2.5 transition-all"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex-1 min-w-0">
            <LocationCombobox
              label="Điểm xuất phát"
              value={origin}
              locations={locations}
              loading={loadingLocations}
              placeholder="Chọn điểm đi"
              tone="origin"
              excludedLocation={destination}
              error={errors.origin}
              variant="capsule"
              onChange={handleOriginChange}
            />
          </div>

          <div className="flex justify-center -my-1 lg:my-0 shrink-0">
            <button
              type="button"
              onClick={handleSwap}
              title="Đổi chiều đi và đến"
              aria-label="Đổi chiều đi và đến"
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-[#FF385C] hover:bg-[#FFF0F2] hover:scale-105 active:scale-95 transition-all group"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <LocationCombobox
              label="Điểm đến"
              value={destination}
              locations={locations}
              loading={loadingLocations}
              placeholder="Chọn điểm đến"
              tone="destination"
              excludedLocation={origin}
              error={errors.destination || errors.match}
              variant="capsule"
              onChange={handleDestinationChange}
            />
          </div>

          <div className="hidden lg:block w-[1px] h-8 bg-gray-200 mx-1 shrink-0" />

          <div className="lg:w-[190px] shrink-0">
            <label
              className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-0.5 px-3"
            >
              Ngày khởi hành
            </label>
            <DatePickerPopover
              value={departureDate}
              minDate={todayStr}
              variant="compact"
              error={errors.departureDate}
              onChange={(newDate) => {
                setDepartureDate(newDate);
                if (errors.departureDate) {
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.departureDate;
                    return next;
                  });
                }
              }}
            />
          </div>

          <div className="shrink-0 pt-1 lg:pt-0">
            <button
              type="submit"
              className="w-full lg:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-[#FF385C] to-[#E61E4F] text-white font-bold text-sm flex items-center justify-center gap-2 glow-coral-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Tìm chuyến</span>
            </button>
          </div>
        </div>
      </form>
    );
  }

  const dockRef = React.useRef<HTMLDivElement>(null);
  const swapRef = React.useRef<HTMLDivElement>(null);
  const [dockMetrics, setDockMetrics] = useState<{
    width: number;
    height: number;
    swapX: number;
  }>({
    width: 1024,
    height: 76,
    swapX: 375,
  });

  useEffect(() => {
    const updateMetrics = () => {
      if (!dockRef.current || !swapRef.current) return;
      const dockRect = dockRef.current.getBoundingClientRect();
      const swapRect = swapRef.current.getBoundingClientRect();
      if (dockRect.width > 0) {
        setDockMetrics({
          width: dockRect.width,
          height: dockRect.height,
          swapX: swapRect.left - dockRect.left + swapRect.width / 2,
        });
      }
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    if (dockRef.current) observer.observe(dockRef.current);
    window.addEventListener("resize", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, []);


  const buildWavePath = (width: number, height: number, swapX: number) => {
    const crestH = 16;
    const topBaseline = crestH;
    const bottomBaseline = topBaseline + height;
    const totalH = bottomBaseline + crestH;
    const R = height / 2;
    const waveHalfW = 74;

    const leftWaveStart = Math.max(R + 8, swapX - waveHalfW);
    const rightWaveEnd = Math.min(width - R - 8, swapX + waveHalfW);
    const actualHalfW = (rightWaveEnd - leftWaveStart) / 2;
    const midX = (leftWaveStart + rightWaveEnd) / 2;

    // Smooth cubic Bezier control points
    const c1x = midX - actualHalfW * 0.52;
    const c2x = midX - actualHalfW * 0.42;
    const c3x = midX + actualHalfW * 0.42;
    const c4x = midX + actualHalfW * 0.52;

    return [
      `M ${R} ${topBaseline}`,
      `L ${leftWaveStart} ${topBaseline}`,
      `C ${c1x} ${topBaseline}, ${c2x} 0, ${midX} 0`,
      `C ${c3x} 0, ${c4x} ${topBaseline}, ${rightWaveEnd} ${topBaseline}`,
      `L ${width - R} ${topBaseline}`,
      `A ${R} ${R} 0 0 1 ${width} ${topBaseline + R}`,
      `A ${R} ${R} 0 0 1 ${width - R} ${bottomBaseline}`,
      `L ${rightWaveEnd} ${bottomBaseline}`,
      `C ${c4x} ${bottomBaseline}, ${c3x} ${totalH}, ${midX} ${totalH}`,
      `C ${c2x} ${totalH}, ${c1x} ${bottomBaseline}, ${leftWaveStart} ${bottomBaseline}`,
      `L ${R} ${bottomBaseline}`,
      `A ${R} ${R} 0 0 1 0 ${topBaseline + R}`,
      `A ${R} ${R} 0 0 1 ${R} ${topBaseline}`,
      "Z",
    ].join(" ");
  };

  const crestH = 16;
  const totalH = dockMetrics.height + 2 * crestH;
  const pathData = buildWavePath(dockMetrics.width, dockMetrics.height, dockMetrics.swapX);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[1040px] mx-auto">
      {/* Main Organic Glass Capsule Dock with Dynamic Pixel-Perfect Math */}
      <div
        ref={dockRef}
        className="relative px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-200"
      >
        {/* Dynamic SVG Organic Wave with Symmetrical Top & Bottom Crests (Desktop) */}
        <svg
          className="hidden lg:block absolute pointer-events-none drop-shadow-[0_22px_45px_rgba(0,0,0,0.18)] z-0"
          style={{
            top: -crestH,
            left: 0,
            width: dockMetrics.width,
            height: totalH,
            overflow: "visible",
          }}
          viewBox={`0 0 ${dockMetrics.width} ${totalH}`}
        >
          <defs>
            <linearGradient id="waveGlassFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.44)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.28)" />
            </linearGradient>
            <linearGradient id="waveGlassBorder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.45)" />
            </linearGradient>
            <clipPath id="waveClip">
              <path d={pathData} />
            </clipPath>
          </defs>
          <path
            d={pathData}
            fill="url(#waveGlassFill)"
            stroke="url(#waveGlassBorder)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Frosted Glass Blur layer clipped to exact organic wave */}
        <div
          className="hidden lg:block absolute pointer-events-none backdrop-blur-2xl z-0"
          style={{
            clipPath: "url(#waveClip)",
            WebkitClipPath: "url(#waveClip)",
            top: -crestH,
            left: 0,
            width: dockMetrics.width,
            height: totalH,
          }}
        />

        {/* Mobile Fallback Container */}
        <div className="lg:hidden absolute inset-0 rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/70 pointer-events-none z-0 shadow-lg" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-2">
          {/* Origin Pill Island */}
          <div className="flex-1 min-w-0">
            <LocationCombobox
              label="Điểm xuất phát"
              value={origin}
              locations={locations}
              loading={loadingLocations}
              placeholder="Điểm đi"
              tone="origin"
              excludedLocation={destination}
              error={errors.origin}
              variant="capsule"
              onChange={handleOriginChange}
            />
          </div>

          {/* Central Organic Wave Swap Circle */}
          <div
            ref={swapRef}
            className="relative flex items-center justify-center -my-1 lg:my-0 lg:px-0.5 z-10 shrink-0"
          >
            <button
              type="button"
              onClick={handleSwap}
              title="Đổi chiều đi và đến"
              aria-label="Đổi chiều đi và đến"
              className="w-12 h-12 rounded-full bg-white shadow-md border border-white/90 flex items-center justify-center text-[#FF385C] hover:scale-110 active:scale-95 transition-all duration-200 group cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
            </button>
          </div>

          {/* Destination Pill Island */}
          <div className="flex-1 min-w-0">
            <LocationCombobox
              label="Điểm đến"
              value={destination}
              locations={locations}
              loading={loadingLocations}
              placeholder="Điểm đến"
              tone="destination"
              excludedLocation={origin}
              error={errors.destination || errors.match}
              variant="capsule"
              onChange={handleDestinationChange}
            />
          </div>

          {/* Departure Date Pill Island */}
          <div className="lg:w-[195px] shrink-0">
            <DatePickerPopover
              value={departureDate}
              minDate={todayStr}
              variant="capsule"
              error={errors.departureDate}
              onChange={(newDate) => {
                setDepartureDate(newDate);
                if (errors.departureDate) {
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.departureDate;
                    return next;
                  });
                }
              }}
            />
          </div>

          {/* Search CTA Pill Button */}
          <div className="shrink-0 pt-1 lg:pt-0">
            <button
              type="submit"
              className="w-full lg:w-auto h-14 px-8 rounded-full bg-gradient-to-r from-[#FF385C] to-[#E61E4F] text-white font-bold text-base flex items-center justify-center gap-2 glow-coral hover:brightness-105 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-[0_0_28px_rgba(255,56,92,0.6)]"
            >
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
