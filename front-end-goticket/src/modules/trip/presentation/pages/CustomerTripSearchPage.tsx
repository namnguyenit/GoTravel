import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
    async (pageToFetch = 1) => {
      if (!currentOrigin.trim() || !currentDestination.trim()) {
        setTrips([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { minPrice, maxPrice } = getPriceRangeValues(filters.priceRange);
      const { sortBy, sortOrder } = getSortParams(sortOption);

      try {
        const res = await tripService.searchTrips({
          origin: currentOrigin,
          destination: currentDestination,
          departureDate: currentDepartureDate,
          type: filters.carType || undefined,
          timeRange: filters.timeRange || undefined,
          minPrice,
          maxPrice,
          sortBy,
          sortOrder,
          page: pageToFetch,
          limit: 10,
        });

        setTrips(res.data);
        setPagination(res.pagination);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách chuyến xe."
        );
        setTrips([]);
      } finally {
        setLoading(false);
      }
    },
    [
      currentOrigin,
      currentDestination,
      currentDepartureDate,
      filters.carType,
      filters.timeRange,
      filters.priceRange,
      sortOption,
    ]
  );

  useEffect(() => {
    executeSearch(1);
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
      <div className="relative z-30 bg-white/85 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-white/80 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100/80 pb-3.5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#FF385C]">
              Tìm chuyến xe khách
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#111827] mt-0.5 font-editorial">
              {currentOrigin && currentDestination
                ? `${currentOrigin} → ${currentDestination}`
                : "Tra cứu lộ trình & Lịch khởi hành"}
            </h1>
          </div>
          {currentDepartureDate && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/80 shadow-2xs w-fit">
              <Calendar className="h-3.5 w-3.5 text-[#FF385C]" />
              <span>Khởi hành: </span>
              <strong className="text-gray-900 tabular-nums">{currentDepartureDate}</strong>
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
      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Sidebar Filters (Desktop 3 cols) */}
        <div className="hidden lg:block lg:col-span-3 sticky top-24">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl sm:rounded-full border border-white/80 bg-white/85 backdrop-blur-md p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden rounded-full text-xs font-bold border-gray-200 h-9 px-3.5 text-gray-700 hover:text-[#FF385C]"
              >
                <Filter className="w-3.5 h-3.5 mr-1.5 text-[#FF385C]" />
                Bộ lọc {activeChips.length > 0 && `(${activeChips.length})`}
              </Button>

              <div className="text-xs text-gray-500 font-medium">
                {currentOrigin && currentDestination ? (
                  <span>
                    Có <strong className="text-gray-900 font-bold tabular-nums">{pagination.total}</strong> chuyến từ{" "}
                    <strong className="text-gray-900">{currentOrigin}</strong> đi{" "}
                    <strong className="text-gray-900">{currentDestination}</strong>
                  </span>
                ) : (
                  <span>Vui lòng chọn điểm đi và điểm đến</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="flex items-center text-xs font-semibold text-gray-400">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                Sắp xếp:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-hidden focus:border-[#FF385C] focus:bg-white transition-all cursor-pointer"
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
          ) : !currentOrigin || !currentDestination ? (
            /* Prompt State when no route selected */
            <EmptyState
              icon={Bus}
              title="Chọn Điểm xuất phát và Điểm đến"
              description="Vui lòng chọn Điểm xuất phát và Điểm đến ở thanh tìm kiếm phía trên để tra cứu các chuyến xe phù hợp."
            />
          ) : trips.length === 0 ? (
            /* Empty State */
            <EmptyState
              icon={Bus}
              title="Không tìm thấy chuyến xe phù hợp"
              description={`Hiện tại không có chuyến xe nào từ ${currentOrigin} đến ${currentDestination} vào ngày ${currentDepartureDate}.`}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {activeChips.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="rounded-full text-xs font-semibold h-9 px-4 border-gray-200"
                    >
                      Xóa bộ lọc tìm kiếm
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      const nextDay = new Date(currentDepartureDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      const nextDayStr = new Date(
                        nextDay.getTime() - nextDay.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 10);
                      setSearchParams({
                        origin: currentOrigin,
                        destination: currentDestination,
                        departureDate: nextDayStr,
                      });
                    }}
                    className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-xs font-bold text-white h-9 px-5 glow-coral-sm transition-all"
                  >
                    Xem ngày hôm sau ({new Date(new Date(currentDepartureDate).getTime() + 86400000).toLocaleDateString('vi-VN')})
                  </Button>
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
                  onViewDetail={handleOpenDetail}
                  onSelectTrip={handleSelectTrip}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs">
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
          <div className="relative w-full max-w-xs bg-white h-full p-5 overflow-y-auto shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <span className="font-bold text-base text-gray-900">Bộ lọc</span>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <CustomerTripFilterSidebar
                filters={filters}
                onChange={setFilters}
                onReset={handleResetFilters}
                totalResults={pagination.total}
                className="border-0 shadow-none p-0"
              />
            </div>
            <div className="pt-4 border-t border-gray-100">
              <Button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-[#FF385C] hover:bg-[#E61E4F] text-white rounded-full font-bold text-xs h-11"
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
