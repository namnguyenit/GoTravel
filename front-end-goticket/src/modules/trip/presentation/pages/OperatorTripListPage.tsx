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
import { useAuth } from "@/modules/auth/presentation/context/AuthContext";
import {
  PageHeader,
  SurfaceCard,
  InlineAlert,
  LoadingState,
  EmptyState,
  Pagination,
  Button,
} from "@/shared/presentation/components";
import {
  CalendarClock,
  Plus,
  Search,
  RotateCcw,
} from "lucide-react";

export const OperatorTripListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isStaffView = Boolean(user?.isStaff() && !user?.isVendor());

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
        if (isStaffView) {
          const assigned = await tripService.getAssignedStaffTrips();
          let filtered = assigned;
          if (statusFilter) {
            filtered = filtered.filter((t) => t.status === statusFilter);
          }
          if (departureDateFilter) {
            filtered = filtered.filter((t) => {
              const d = new Date(t.departureTime);
              return !isNaN(d.getTime()) && d.toISOString().startsWith(departureDateFilter);
            });
          }
          if (keywordInput.trim()) {
            const kw = keywordInput.toLowerCase().trim();
            filtered = filtered.filter(
              (t) =>
                t.car?.name?.toLowerCase().includes(kw) ||
                t.car?.licensePlate?.toLowerCase().includes(kw) ||
                t.getSummaryRoute().toLowerCase().includes(kw)
            );
          }

          setTrips(filtered);
          setPagination({
            page: 1,
            limit: Math.max(filtered.length, 1),
            total: filtered.length,
            totalPages: 1,
          });
          setKpi({
            totalTrips: assigned.length,
            scheduledTrips: assigned.filter((t) => t.isScheduled()).length,
            departedTrips: assigned.filter((t) => t.isDeparted()).length,
            completedTrips: assigned.filter((t) => t.isCompleted()).length,
            cancelledTrips: assigned.filter((t) => t.isCancelled()).length,
          });
        } else {
          const result = await tripService.getTrips({
            page: pageToFetch,
            limit: pagination.limit,
            keyword: keywordInput.trim() || undefined,
            status: statusFilter || undefined,
            departureDate: departureDateFilter || undefined,
            sortBy,
            sortOrder,
          });

          setTrips(result.data);
          setKpi(result.kpi);
          setPagination(result.pagination);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách chuyến xe. Vui lòng thử lại sau."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      isStaffView,
      pagination.limit,
      pagination.page,
      sortOption,
      statusFilter,
      departureDateFilter,
      keywordInput,
    ]
  );

  useEffect(() => {
    const pageFromUrl = Number(searchParams.get("page")) || 1;
    const statusFromUrl =
      (searchParams.get("status") as TripStatus | "") || "";
    const dateFromUrl = searchParams.get("date") || "";
    const searchFromUrl = searchParams.get("search") || "";
    const sortFromUrl = searchParams.get("sort") || "departureTime_asc";

    setStatusFilter(statusFromUrl);
    setDepartureDateFilter(dateFromUrl);
    setKeywordInput(searchFromUrl);
    setSortOption(sortFromUrl);

    fetchTrips(pageFromUrl);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({
      page: "1",
      search: keywordInput.trim() || null,
      status: statusFilter || null,
      date: departureDateFilter || null,
      sort: sortOption !== "departureTime_asc" ? sortOption : null,
    });
    fetchTrips(1);
  };

  const handleResetFilters = () => {
    setKeywordInput("");
    setStatusFilter("");
    setDepartureDateFilter("");
    setSortOption("departureTime_asc");
    setSearchParams({});
    fetchTrips(1);
  };

  const updateUrlParams = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, val]) => {
      if (val === null || val === "") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next);
  };

  const handleTripCreated = (newTrip: TripEntity) => {
    setIsCreateModalOpen(false);
    setSuccessToast(
      `Đã tạo thành công chuyến xe mới: "${newTrip.getSummaryRoute()}"`
    );
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
        <InlineAlert
          variant="success"
          title="Thông báo"
          message={successToast}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi vận hành"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={isStaffView ? "Chuyến được phân công" : "Quản lý Chuyến xe"}
        eyebrow={isStaffView ? "Kênh Nhân Viên" : "Kênh Nhà Xe"}
        description={
          isStaffView
            ? "Theo dõi các chuyến xe thuộc phạm vi được nhà xe giao quyền vận hành."
            : "Lên lịch trình vận hành các chuyến xe khách, theo dõi trạng thái di chuyển và tỷ lệ lấp đầy ghế."
        }
        actions={
          !isStaffView && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Tạo chuyến xe mới</span>
            </Button>
          )
        }
      />

      {/* Overview KPI Cards */}
      <TripKpiCards kpi={kpi} loading={loading} />

      {/* Toolbar: Search, Filters & Sort */}
      <SurfaceCard className="p-4 sm:p-5">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          {/* Keyword Search Form */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute top-3 left-3 h-4 w-4 text-[var(--gt-muted)]" />
            <input
              type="text"
              placeholder="Lộ trình, tên xe, biển số..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full rounded-2xl border border-[var(--gt-border)] bg-white py-2 pl-9 pr-3 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-medium text-[var(--gt-muted)]">
                Trạng thái:
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TripStatus | "")
                }
                className="rounded-2xl border border-[var(--gt-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gt-ink)] focus:border-[var(--gt-coral)] focus:outline-none"
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
              <span className="text-xs font-medium text-[var(--gt-muted)]">
                Ngày:
              </span>
              <input
                type="date"
                value={departureDateFilter}
                onChange={(e) => setDepartureDateFilter(e.target.value)}
                className="rounded-2xl border border-[var(--gt-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--gt-ink)] focus:border-[var(--gt-coral)] focus:outline-none"
              />
            </div>

            {/* Sort Control */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-medium text-[var(--gt-muted)]">
                Sắp xếp:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-2xl border border-[var(--gt-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gt-ink)] focus:border-[var(--gt-coral)] focus:outline-none"
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

            <button
              type="submit"
              className="rounded-2xl bg-[var(--gt-ink)] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-black"
            >
              Lọc
            </button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 text-xs text-[var(--gt-muted)] hover:text-[var(--gt-ink)]"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </Button>
            )}
          </div>
        </form>
      </SurfaceCard>

      {/* Trip Cards List */}
      {loading ? (
        <SurfaceCard className="p-8">
          <LoadingState message="Đang tải danh sách các chuyến xe..." />
        </SurfaceCard>
      ) : trips.length === 0 ? (
        <SurfaceCard className="p-8">
          <EmptyState
            icon={CalendarClock}
            title={
              hasActiveFilters
                ? "Không tìm thấy chuyến xe phù hợp"
                : "Chưa có chuyến xe nào được lên lịch"
            }
            description={
              hasActiveFilters
                ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ các bộ lọc để xem các chuyến xe khác."
                : "Bắt đầu lên lịch trình chuyến xe đầu tiên phục vụ hành khách đặt vé."
            }
            action={
              !isStaffView ? (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Lên lịch chuyến xe đầu tiên</span>
                </Button>
              ) : undefined
            }
          />
        </SurfaceCard>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {trips.map((trip, index) => {
              const itemIndex =
                (pagination.page - 1) * pagination.limit + index + 1;
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  index={itemIndex}
                  onViewRouteDetail={handleOpenRouteDetailModal}
                  onRequestUpdateStatus={
                    isStaffView && !user?.canManageTrips()
                      ? undefined
                      : handleRequestUpdateStatus
                  }
                />
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <SurfaceCard className="p-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => {
                  updateUrlParams({ page: String(p) });
                  fetchTrips(p);
                }}
              />
            </SurfaceCard>
          )}
        </div>
      )}

      {/* Create Trip Modal */}
      {!isStaffView && (
        <CreateTripModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleTripCreated}
        />
      )}

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
