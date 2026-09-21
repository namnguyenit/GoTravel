import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Loader2,
  AlertCircle,
  Bus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export const CustomerTripSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Modal & Selection state
  const [selectedTripForDetail, setSelectedTripForDetail] =
    useState<CustomerTripEntity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [bookedToast, setBookedToast] = useState<string | null>(null);

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
    setBookedToast(
      `Bạn đã chọn chuyến ${trip.getSummaryRoute()} lúc ${trip.getDepartureTimeOnly()} của ${
        trip.operator.name
      }. Tính năng đặt chỗ & thanh toán vé sẽ sẵn sàng trong bản cập nhật tiếp theo!`
    );
    setTimeout(() => {
      setBookedToast(null);
    }, 6000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast feedback */}
      {bookedToast && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed top-20 right-4 z-50 max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Đã chọn chuyến thành công
              </h4>
              <p className="mt-1 text-xs text-emerald-700">{bookedToast}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Search Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-lg sm:p-8">
        <div className="mb-4">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
            Tìm kiếm & Đặt vé xe trực tuyến
          </span>
          <h1 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
            Vé xe từ {currentOrigin} đi {currentDestination}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blue-100">
            <Calendar className="h-3.5 w-3.5" />
            Khởi hành ngày: <strong>{currentDepartureDate}</strong>
          </p>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sidebar Filters (3 cols) */}
        <div className="lg:col-span-3">
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
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center">
            <div className="text-xs text-gray-500">
              Có <strong className="text-gray-900">{pagination.total}</strong>{" "}
              chuyến xe từ{" "}
              <strong className="text-blue-600">{currentOrigin}</strong> đi{" "}
              <strong className="text-red-500">{currentDestination}</strong>
            </div>

            <div className="flex items-center space-x-2">
              <span className="flex items-center text-xs font-semibold text-gray-500">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                Sắp xếp:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-hidden"
              >
                <option value="departureTime_asc">Giờ chạy: Sớm nhất</option>
                <option value="departureTime_desc">Giờ chạy: Muộn nhất</option>
                <option value="pricePerSeat_asc">Giá vé: Thấp ➔ Cao</option>
                <option value="pricePerSeat_desc">Giá vé: Cao ➔ Thấp</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 text-gray-500">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-gray-800">
                Đang tìm kiếm chuyến xe phù hợp...
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Kiểm tra tình trạng ghế trống và lịch trình theo thời gian thực
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center text-red-800">
              <AlertCircle className="mb-2 h-8 w-8 text-red-600" />
              <h3 className="text-base font-bold">Không thể tải chuyến xe</h3>
              <p className="mt-1 max-w-md text-xs text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeSearch(1)}
                className="mt-4 border-red-200 text-xs text-red-700 hover:bg-red-100"
              >
                Thử lại
              </Button>
            </div>
          ) : !currentOrigin || !currentDestination ? (
            /* Prompt State when no route selected */
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Bus className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">
                Chọn Điểm xuất phát và Điểm đến
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-gray-500">
                Vui lòng chọn Điểm xuất phát và Điểm đến ở thanh tìm kiếm phía
                trên để tra cứu các chuyến xe phù hợp.
              </p>
            </div>
          ) : trips.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Bus className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">
                Không tìm thấy chuyến xe nào
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-gray-500">
                Hiện tại không có chuyến xe nào từ{" "}
                <strong>{currentOrigin}</strong> đến{" "}
                <strong>{currentDestination}</strong> vào ngày{" "}
                <strong>{currentDepartureDate}</strong>.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs"
                >
                  Xóa bộ lọc tìm kiếm
                </Button>
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
                  className="bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Xem ngày hôm sau
                </Button>
              </div>
            </div>
          ) : (
            /* Trips List */
            <div className="space-y-3.5">
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
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-2xs sm:flex-row">
              <div>
                Trang{" "}
                <strong className="text-gray-900">{pagination.page}</strong> /{" "}
                <strong className="text-gray-900">
                  {pagination.totalPages}
                </strong>{" "}
                (Tổng{" "}
                <strong className="text-gray-900">{pagination.total}</strong>{" "}
                chuyến xe)
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => executeSearch(pagination.page - 1)}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Trước
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => executeSearch(pagination.page + 1)}
                  className="h-8 text-xs"
                >
                  Sau
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};
