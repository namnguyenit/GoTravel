import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDiscoverLocation } from "../hooks/useDiscoverLocation";
import { tripService } from "../../composition";
import type { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import type { TripPaginationMeta } from "../../application/port/trip.service.interface";
import { TripSearchQueryVO } from "../../domain/value-object/trip-search-query.vo";
import { TripSearchForm } from "../components/TripSearchForm";
import { CustomerTripCard } from "../components/CustomerTripCard";
import { CustomerTripDetailModal } from "../components/CustomerTripDetailModal";
import {
  CustomerTripFilterSidebar,
  type CustomerTripFilters,
} from "../components/CustomerTripFilterSidebar";
import { Button } from "@/components/ui/button";
import {
  Bus,
  ArrowUpDown,
  Calendar,
  Filter,
  X,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { CustomerPageContainer } from "@/shared/presentation/components/layout/CustomerPageContainer";
import { LoadingState } from "@/shared/presentation/components/feedback/LoadingState";
import { ErrorState } from "@/shared/presentation/components/feedback/ErrorState";
import { EmptyState } from "@/shared/presentation/components/feedback/EmptyState";
import { Pagination } from "@/shared/presentation/components/data-display/Pagination";
import { ActiveFilterChips } from "@/shared/presentation/components/forms/ActiveFilterChips";

export const CustomerTripSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const todayStr = TripSearchQueryVO.getTodayDateString();
  const currentOrigin = searchParams.get("origin") || "";
  const currentDestination = searchParams.get("destination") || "";
  const currentDepartureDate = searchParams.get("departureDate") || todayStr;
  const discovering = !currentOrigin.trim() || !currentDestination.trim();
  const queryDate =
    searchParams.get("departureDate") || (discovering ? "" : todayStr);
  const automaticLocation = !currentOrigin.trim() && !currentDestination.trim();
  const geo = useDiscoverLocation(automaticLocation);
  const [discovery, setDiscovery] = useState<{
    origin?: string;
    nearby: boolean;
    fallback: boolean;
  }>();
  const sequence = useRef(0);
  const preferredOrigin = automaticLocation ? geo.city : "";

  // Search Results state
  const [trips, setTrips] = useState<CustomerTripEntity[]>([]);
  const [pagination, setPagination] = useState<TripPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Sorting state
  const [filters, setFilters] = useState<CustomerTripFilters>({
    carType: "",
    timeRange: "",
    priceRange: "",
  });
  const [sortOption, setSortOption] = useState<string>("departureTime_asc");
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Modal & Selection state
  const [selectedTripForDetail, setSelectedTripForDetail] =
    useState<CustomerTripEntity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const getPriceRangeValues = (priceRange: string) => {
    switch (priceRange) {
      case "UNDER_200K":
        return { maxPrice: 200000 };
      case "200K_350K":
        return { minPrice: 200000, maxPrice: 350000 };
      case "OVER_350K":
        return { minPrice: 350000 };
      default:
        return {};
    }
  };

  const getSortParams = (option: string) => {
    switch (option) {
      case "departureTime_desc":
        return { sortBy: "departureTime" as const, sortOrder: "desc" as const };
      case "pricePerSeat_asc":
        return { sortBy: "pricePerSeat" as const, sortOrder: "asc" as const };
      case "pricePerSeat_desc":
        return { sortBy: "pricePerSeat" as const, sortOrder: "desc" as const };
      case "departureTime_asc":
      default:
        return { sortBy: "departureTime" as const, sortOrder: "asc" as const };
    }
  };

  const executeSearch = useCallback(
    async (pageToFetch = 1): Promise<void> => {
      const current = ++sequence.current;
      setLoading(true);
      setError(null);

      const { minPrice, maxPrice } = getPriceRangeValues(filters.priceRange);
      const { sortBy, sortOrder } = getSortParams(sortOption);

      try {
        const res = await tripService.searchTrips({
          origin: currentOrigin,
          destination: currentDestination,
          departureDate: queryDate,
          discover: discovering,
          preferredOrigin: preferredOrigin || undefined,
          type: filters.carType || undefined,
          timeRange: filters.timeRange || undefined,
          minPrice,
          maxPrice,
          sortBy,
          sortOrder,
          page: pageToFetch,
          limit: 10,
        });

        if (current !== sequence.current) return;
        if (
          res.pagination.total > 0 &&
          pageToFetch > res.pagination.totalPages
        ) {
          void executeSearch(1);
          return;
        }
        setTrips(res.data);
        setDiscovery(res.discovery);
        setPagination(res.pagination);
      } catch (err: unknown) {
        if (current !== sequence.current) return;
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách chuyến xe."
        );
        setTrips([]);
      } finally {
        if (current === sequence.current) setLoading(false);
      }
    },
    [
      currentOrigin,
      currentDestination,
      queryDate,
      discovering,
      preferredOrigin,
      filters.carType,
      filters.timeRange,
      filters.priceRange,
      sortOption,
    ]
  );

  useEffect(() => {
    void executeSearch(1);
    return () => {
      sequence.current++;
    };
  }, [executeSearch]);

  const handleSearchFormSubmit = (criteria: {
    origin: string;
    destination: string;
    departureDate: string;
  }) => {
    setSearchParams({
      origin: criteria.origin,
      destination: criteria.destination,
      departureDate: criteria.departureDate,
    });
  };

  const handleResetFilters = () => {
    setFilters({
      carType: "",
      timeRange: "",
      priceRange: "",
    });
    setSortOption("departureTime_asc");
  };

  const handleOpenDetail = (trip: CustomerTripEntity) => {
    setSelectedTripForDetail(trip);
    setIsDetailModalOpen(true);
  };

  const handleSelectTrip = (trip: CustomerTripEntity) => {
    navigate(`/trips/${trip.id}`);
  };

  // Build active filter chips list
  const activeChips = [];
  if (filters.carType) {
    const labelMap: Record<string, string> = {
      LIMOUSINE: "Limousine VIP",
      SLEEPER: "Giường nằm",
      SEAT: "Ghế ngồi",
    };
    activeChips.push({
      id: "carType",
      label: "Loại xe",
      valueDisplay: labelMap[filters.carType] || filters.carType,
    });
  }
  if (filters.timeRange) {
    const labelMap: Record<string, string> = {
      EARLY_MORNING: "Sáng sớm",
      MORNING: "Buổi sáng",
      AFTERNOON: "Buổi chiều",
      EVENING: "Buổi tối",
    };
    activeChips.push({
      id: "timeRange",
      label: "Khung giờ",
      valueDisplay: labelMap[filters.timeRange] || filters.timeRange,
    });
  }
  if (filters.priceRange) {
    const labelMap: Record<string, string> = {
      UNDER_200K: "< 200.000 ₫",
      "200K_350K": "200.000 ₫ - 350.000 ₫",
      OVER_350K: "> 350.000 ₫",
    };
    activeChips.push({
      id: "priceRange",
      label: "Mức giá",
      valueDisplay: labelMap[filters.priceRange] || filters.priceRange,
    });
  }

  const handleRemoveChip = (id: string) => {
    setFilters((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <CustomerPageContainer className="space-y-6 pb-16">
      {/* Top Search Dock Section */}
      <div className="relative z-30 space-y-4 rounded-3xl border border-white/80 bg-white/85 p-5 shadow-md backdrop-blur-xl sm:p-7">
        <div className="flex flex-col justify-between gap-2 border-b border-gray-100/80 pb-3.5 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-bold tracking-wider text-[var(--gt-brand)] uppercase">
              Tìm chuyến xe khách
            </div>
            <h1 className="font-editorial mt-0.5 text-xl font-black tracking-tight text-[#111827] sm:text-2xl">
              {currentOrigin && currentDestination
                ? `${currentOrigin} → ${currentDestination}`
                : discovery?.nearby
                  ? `Từ ${discovery.origin} đi mọi nơi`
                  : currentOrigin
                    ? `Từ ${currentOrigin} đi mọi nơi`
                    : currentDestination
                      ? `Các chuyến đến ${currentDestination}`
                      : "Khám phá chuyến xe"}
            </h1>
          </div>
          {currentDepartureDate && (
            <div className="flex w-fit items-center gap-1.5 rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs backdrop-blur-xs">
              <Calendar className="h-3.5 w-3.5 text-[var(--gt-brand)]" />
              <span>
                {discovering && !queryDate ? "Từ hôm nay: " : "Khởi hành: "}
              </span>
              <strong className="text-gray-900 tabular-nums">
                {currentDepartureDate}
              </strong>
            </div>
          )}
        </div>

        {/* Embedded Trip Search Form */}
        <TripSearchForm
          initialOrigin={currentOrigin}
          initialDestination={currentDestination}
          initialDate={currentDepartureDate}
          onSearch={handleSearchFormSubmit}
          compact
        />
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Sidebar Filters (Desktop 3 cols) */}
        <div className="sticky top-24 hidden lg:col-span-3 lg:block">
          <CustomerTripFilterSidebar
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
            totalResults={pagination.total}
          />
        </div>

        {/* Right Search Results (9 cols) */}
        <div className="space-y-4 lg:col-span-9">
          {/* Sorting & Result Count Bar */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-2xs backdrop-blur-md sm:flex-row sm:items-center sm:rounded-full sm:p-4">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileFilterOpen(true)}
                className="h-9 rounded-full border-gray-200 px-3.5 text-xs font-bold text-gray-700 hover:text-[var(--gt-brand)] lg:hidden"
              >
                <Filter className="mr-1.5 h-3.5 w-3.5 text-[var(--gt-brand)]" />
                Bộ lọc {activeChips.length > 0 && `(${activeChips.length})`}
              </Button>

              <div className="text-xs font-medium text-gray-500">
                {currentOrigin && currentDestination ? (
                  <span>
                    Có{" "}
                    <strong className="font-bold text-gray-900 tabular-nums">
                      {pagination.total}
                    </strong>{" "}
                    chuyến từ{" "}
                    <strong className="text-gray-900">{currentOrigin}</strong>{" "}
                    đi{" "}
                    <strong className="text-gray-900">
                      {currentDestination}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Có{" "}
                    <strong className="text-gray-900 tabular-nums">
                      {pagination.total}
                    </strong>{" "}
                    chuyến
                    {discovery?.nearby
                      ? ` từ ${discovery.origin} đi mọi nơi`
                      : " còn mở bán"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center space-x-2">
              <span className="flex items-center text-xs font-semibold text-gray-400">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                Sắp xếp:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="cursor-pointer rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 transition-all focus:border-[var(--gt-brand)] focus:bg-white focus:outline-hidden"
              >
                <option value="departureTime_asc">Giờ chạy: Sớm nhất</option>
                <option value="departureTime_desc">Giờ chạy: Muộn nhất</option>
                <option value="pricePerSeat_asc">Giá vé: Thấp → Cao</option>
                <option value="pricePerSeat_desc">Giá vé: Cao → Thấp</option>
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          <ActiveFilterChips
            chips={activeChips}
            onRemove={handleRemoveChip}
            onClearAll={handleResetFilters}
          />

          {/* Loading State */}
          {loading ? (
            <LoadingState count={3} />
          ) : error ? (
            <ErrorState
              title="Không thể tải danh sách chuyến xe"
              error={error}
              onRetry={() => executeSearch(pagination.page)}
            />
          ) : trips.length === 0 ? (
            /* Empty State */
            <EmptyState
              icon={Bus}
              title="Không tìm thấy chuyến xe phù hợp"
              description={
                discovering
                  ? "Chưa có chuyến còn mở bán phù hợp với bộ lọc hiện tại. Bạn có thể bỏ bộ lọc hoặc chọn tuyến và ngày khác."
                  : `Hiện tại không có chuyến xe nào từ ${currentOrigin} đến ${currentDestination} vào ngày ${currentDepartureDate}.`
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {activeChips.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-9 rounded-full border-gray-200 px-4 text-xs font-semibold"
                    >
                      Xóa bộ lọc tìm kiếm
                    </Button>
                  )}
                  {!discovering && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const nextDay = new Date(currentDepartureDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const nextDayStr = new Date(
                          nextDay.getTime() -
                            nextDay.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 10);
                        setSearchParams({
                          origin: currentOrigin,
                          destination: currentDestination,
                          departureDate: nextDayStr,
                        });
                      }}
                      className="shadow-brand-sm h-9 rounded-full bg-[var(--gt-brand)] px-5 text-xs font-bold text-white transition-all hover:bg-[var(--gt-brand-hover)]"
                    >
                      Xem ngày hôm sau (
                      {new Date(
                        new Date(currentDepartureDate).getTime() + 86400000
                      ).toLocaleDateString("vi-VN")}
                      )
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            /* Trips List */
            <div className="space-y-4">
              {trips.map((trip) => (
                <CustomerTripCard
                  key={trip.id}
                  trip={trip}
                  showDepartureDate={discovering && !queryDate}
                  onViewDetail={handleOpenDetail}
                  onSelectTrip={handleSelectTrip}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!error && pagination.totalPages > 1 && (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                onPageChange={(p) => executeSearch(p)}
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet / Backdrop */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-xs flex-col justify-between overflow-y-auto bg-white p-5 shadow-2xl duration-200">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-base font-bold text-gray-900">
                  Bộ lọc
                </span>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CustomerTripFilterSidebar
                filters={filters}
                onChange={setFilters}
                onReset={handleResetFilters}
                totalResults={pagination.total}
                className="border-0 p-0 shadow-none"
              />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <Button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="h-11 w-full rounded-full bg-[var(--gt-brand)] text-xs font-bold text-white hover:bg-[var(--gt-brand-hover)]"
              >
                Áp dụng bộ lọc
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Trip Detail Modal */}
      <CustomerTripDetailModal
        trip={selectedTripForDetail}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTripForDetail(null);
        }}
        onSelectTrip={handleSelectTrip}
      />
    </CustomerPageContainer>
  );
};
