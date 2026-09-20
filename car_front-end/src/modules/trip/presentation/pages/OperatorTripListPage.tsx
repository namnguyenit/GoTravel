import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { tripService } from "../../composition";
import type { TripEntity } from "../../domain/entity/trip.entity";
import type {
  TripKpiStats,
  TripPaginationMeta,
} from "../../application/port/trip.service.interface";
import type { TripStatus } from "../../domain/value-object/trip-status.vo";
import { TripKpiCards } from "../components/TripKpiCards";
import { TripCard } from "../components/TripCard";
import { CreateTripModal } from "../components/CreateTripModal";
import { TripRouteDetailModal } from "../components/TripRouteDetailModal";
import { ConfirmUpdateTripStatusModal } from "../components/ConfirmUpdateTripStatusModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Plus,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export const OperatorTripListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [trips, setTrips] = useState<TripEntity[]>([]);
  const [kpi, setKpi] = useState<TripKpiStats>({
    totalTrips: 0,
    scheduledTrips: 0,
    departedTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
  });
  const [pagination, setPagination] = useState<TripPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "">("");
  const [departureDateFilter, setDepartureDateFilter] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("departureTime_asc");

  // Modal & Toast state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTripForRouteDetail, setSelectedTripForRouteDetail] =
    useState<TripEntity | null>(null);
  const [isRouteDetailModalOpen, setIsRouteDetailModalOpen] =
    useState<boolean>(false);
  const [selectedTripForStatusUpdate, setSelectedTripForStatusUpdate] =
    useState<TripEntity | null>(null);
  const [targetStatusForUpdate, setTargetStatusForUpdate] =
    useState<TripStatus | null>(null);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] =
    useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const getSortParams = (option: string) => {
    switch (option) {
      case "departureTime_desc":
        return { sortBy: "departureTime" as const, sortOrder: "desc" as const };
      case "pricePerSeat_asc":
        return { sortBy: "pricePerSeat" as const, sortOrder: "asc" as const };
      case "pricePerSeat_desc":
        return { sortBy: "pricePerSeat" as const, sortOrder: "desc" as const };
      case "createdAt_desc":
        return { sortBy: "createdAt" as const, sortOrder: "desc" as const };
      case "departureTime_asc":
      default:
        return { sortBy: "departureTime" as const, sortOrder: "asc" as const };
    }
  };

  const fetchTrips = useCallback(
    async (pageToFetch = pagination.page) => {
      setLoading(true);
      setError(null);

      const { sortBy, sortOrder } = getSortParams(sortOption);

      try {
        const res = await tripService.getTrips({
          page: pageToFetch,
          limit: pagination.limit,
          keyword: keywordInput,
          status: statusFilter || undefined,
          departureDate: departureDateFilter || undefined,
          sortBy,
          sortOrder,
        });

        setTrips(res.data);
        setKpi(res.kpi);
        setPagination(res.pagination);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách chuyến xe.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.page,
      pagination.limit,
      keywordInput,
      statusFilter,
      departureDateFilter,
      sortOption,
    ]
  );

  // Automatically open modal if ?action=new or ?action=create
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new" || action === "create") {
      setIsCreateModalOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchTrips(1);
  }, [statusFilter, departureDateFilter, sortOption, fetchTrips]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrips(1);
  };

  const handleResetFilters = () => {
    setKeywordInput("");
    setStatusFilter("");
    setDepartureDateFilter("");
    setSortOption("departureTime_asc");
  };

  const handleTripCreated = (newTrip: TripEntity) => {
    setSuccessToast(
      `Lên lịch chuyến xe "${newTrip.getSummaryRoute()}" thành công!`
    );
    // Refresh list from server to get accurate KPI and order
    fetchTrips(1);

    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const handleOpenRouteDetailModal = (trip: TripEntity) => {
    setSelectedTripForRouteDetail(trip);
    setIsRouteDetailModalOpen(true);
  };

  const handleCloseRouteDetailModal = () => {
    setIsRouteDetailModalOpen(false);
    setSelectedTripForRouteDetail(null);
  };

  const handleRequestUpdateStatus = (
    trip: TripEntity,
    targetStatus: TripStatus
  ) => {
    setSelectedTripForStatusUpdate(trip);
    setTargetStatusForUpdate(targetStatus);
    setIsStatusUpdateModalOpen(true);
  };

  const handleCloseStatusUpdateModal = () => {
    if (updatingStatus) return;
    setIsStatusUpdateModalOpen(false);
    setSelectedTripForStatusUpdate(null);
    setTargetStatusForUpdate(null);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedTripForStatusUpdate || !targetStatusForUpdate) return;
    setUpdatingStatus(true);
    try {
      const updatedTrip = await tripService.updateTripStatus(
        selectedTripForStatusUpdate.id,
        targetStatusForUpdate
      );

      const actionName =
        targetStatusForUpdate === "DEPARTED"
          ? "Xuất bến"
          : targetStatusForUpdate === "COMPLETED"
            ? "Hoàn thành chuyến"
            : "Hủy chuyến";

      setSuccessToast(
        `${actionName} cho chuyến xe "${updatedTrip.getSummaryRoute()}" thành công!`
      );

      // Refresh list to update KPI and trips accurately
      fetchTrips(pagination.page);

      setIsStatusUpdateModalOpen(false);
      setSelectedTripForStatusUpdate(null);
      setTargetStatusForUpdate(null);

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Cập nhật trạng thái chuyến xe thất bại."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const hasActiveFilters = Boolean(
    keywordInput ||
    statusFilter !== "" ||
    departureDateFilter !== "" ||
    sortOption !== "departureTime_asc"
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-green-800 shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-green-600 hover:text-green-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Quản lý Chuyến xe
            </h1>
            <Badge
              variant="secondary"
              className="bg-blue-50 text-xs font-semibold text-blue-700"
            >
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Kênh Nhà Xe
            </Badge>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Lên lịch trình vận hành các chuyến xe khách, theo dõi trạng thái di
            chuyển và tỷ lệ đặt vé.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo chuyến xe mới</span>
        </Button>
      </div>

      {/* Overview KPI Cards */}
      <TripKpiCards kpi={kpi} loading={loading} />

      {/* Toolbar: Search, Filters & Sort */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Keyword Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 items-center space-x-2"
          >
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Lộ trình, tên xe, biển số..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="text-xs font-semibold"
            >
              Tìm kiếm
            </Button>
          </form>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-medium text-gray-500">
                Trạng thái:
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TripStatus | "")
                }
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="SCHEDULED">Sắp chạy</option>
                <option value="DEPARTED">Đang chạy</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            {/* Departure Date Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-medium text-gray-500">
                Ngày chạy:
              </span>
              <Input
                type="date"
                value={departureDateFilter}
                onChange={(e) => setDepartureDateFilter(e.target.value)}
                className="h-8 w-36 bg-white px-2 text-xs"
              />
            </div>

            {/* Sort Control */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-medium text-gray-500">
                Sắp xếp:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="departureTime_asc">
                  Giờ xuất bến (Sớm nhất)
                </option>
                <option value="departureTime_desc">
                  Giờ xuất bến (Muộn nhất)
                </option>
                <option value="pricePerSeat_asc">Giá vé (Thấp nhất)</option>
                <option value="pricePerSeat_desc">Giá vé (Cao nhất)</option>
                <option value="createdAt_desc">Ngày tạo (Mới nhất)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 text-xs text-gray-500 hover:text-gray-900"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchTrips()}
            className="border-red-200 bg-white text-xs text-red-700 hover:bg-red-50"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Trip Cards List */}
      {loading ? (
        // Skeleton
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs"
            >
              <div className="h-5 w-1/3 rounded bg-gray-200" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="h-16 rounded-lg bg-gray-100" />
                <div className="h-16 rounded-lg bg-gray-100" />
                <div className="h-16 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        // Empty State
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center shadow-xs">
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-blue-50 p-4 text-blue-600">
              <CalendarClock className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-gray-800">
                {hasActiveFilters
                  ? "Không tìm thấy chuyến xe phù hợp"
                  : "Chưa có chuyến xe nào được lên lịch"}
              </p>
              <p className="text-xs text-gray-500">
                {hasActiveFilters
                  ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ các bộ lọc để xem các chuyến xe khác."
                  : "Bắt đầu lên lịch trình chuyến xe đầu tiên phục vụ hành khách đặt vé."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Lên lịch chuyến xe đầu tiên</span>
            </Button>
          </div>
        </div>
      ) : (
        // List
        <div className="space-y-4">
          {trips.map((trip, index) => {
            const itemIndex =
              (pagination.page - 1) * pagination.limit + index + 1;
            return (
              <TripCard
                key={trip.id}
                trip={trip}
                index={itemIndex}
                onViewRouteDetail={handleOpenRouteDetailModal}
                onRequestUpdateStatus={handleRequestUpdateStatus}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-xs sm:flex-row">
          <div>
            Hiển thị{" "}
            <span className="font-semibold text-gray-900">
              {trips.length > 0
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-gray-900">
              {(pagination.page - 1) * pagination.limit + trips.length}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-semibold text-gray-900">
              {pagination.total}
            </span>{" "}
            chuyến xe
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchTrips(pagination.page - 1)}
              className="h-8 text-xs"
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              <span>Trước</span>
            </Button>
            <span className="px-2 font-medium text-gray-700">
              Trang {pagination.page} / {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.page >= (pagination.totalPages || 1) || loading
              }
              onClick={() => fetchTrips(pagination.page + 1)}
              className="h-8 text-xs"
            >
              <span>Sau</span>
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      <CreateTripModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTripCreated}
      />

      {/* Trip Route Detail Modal */}
      <TripRouteDetailModal
        open={isRouteDetailModalOpen}
        trip={selectedTripForRouteDetail}
        onClose={handleCloseRouteDetailModal}
      />

      {/* Confirm Update Trip Status Modal */}
      <ConfirmUpdateTripStatusModal
        open={isStatusUpdateModalOpen}
        trip={selectedTripForStatusUpdate}
        targetStatus={targetStatusForUpdate}
        loading={updatingStatus}
        onClose={handleCloseStatusUpdateModal}
        onConfirm={handleConfirmStatusUpdate}
      />
    </div>
  );
};
