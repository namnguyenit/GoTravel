import React, { useEffect, useState, useCallback, useRef } from "react";
import { vietnamDate } from '@/shared/utils/vietnam-date';
import { useSearchParams, useLocation } from "react-router-dom";
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
  const inStaffPortal = useLocation().pathname.startsWith('/staff');
  const isStaffView = inStaffPortal;
  const [today, setToday] = useState(() => vietnamDate());
  const selectedDate = searchParams.get('date') || today;
  const appliedStatus = (searchParams.get('status') || '') as TripStatus | '';
  const appliedKeyword = searchParams.get('search') || '';
  const appliedSort = searchParams.get('sort') || 'departureTime_asc';
  const selectedPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const requestSequence = useRef(0);

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
  const [keywordInput, setKeywordInput] = useState<string>(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<TripStatus | "">(() => (searchParams.get('status') || '') as TripStatus | '');
  const [departureDateFilter, setDepartureDateFilter] = useState<string>(selectedDate);
  const [sortOption, setSortOption] = useState<string>(() => searchParams.get('sort') || 'departureTime_asc');

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

  // The URL is the applied filter; edits in the form never affect background refreshes.
  const fetchTrips = useCallback(
    async (pageToFetch = selectedPage, silent = false) => {
      const sequence = ++requestSequence.current;
      if (!silent) setLoading(true);
      setError(null);
      const { sortBy, sortOrder } = getSortParams(appliedSort);

      try {
        if (isStaffView) {
          const assigned = await tripService.getAssignedStaffTrips(user?.operatorId || undefined);
          const dayTrips = assigned.filter((trip) => vietnamDate(trip.departureTime) === selectedDate);
          let filtered = dayTrips;
          if (appliedStatus) filtered = filtered.filter((trip) => trip.status === appliedStatus);
          if (appliedKeyword.trim()) {
            const keyword = appliedKeyword.toLowerCase().trim();
            filtered = filtered.filter((trip) =>
              trip.car?.name?.toLowerCase().includes(keyword) ||
              trip.car?.licensePlate?.toLowerCase().includes(keyword) ||
              trip.getSummaryRoute().toLowerCase().includes(keyword)
            );
          }
          filtered = [...filtered].sort((a, b) => {
            const direction = sortOrder === 'asc' ? 1 : -1;
            if (sortBy === 'pricePerSeat') return (a.pricePerSeat - b.pricePerSeat) * direction;
            return (new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()) * direction;
          });
          if (sequence !== requestSequence.current) return;
          const now = Date.now();
          setTrips(filtered.slice((pageToFetch - 1) * 10, pageToFetch * 10));
          setPagination({ page: pageToFetch, limit: 10, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / 10)) });
          setKpi({
            totalTrips: dayTrips.length,
            scheduledTrips: dayTrips.filter((trip) => !trip.isTerminal() && new Date(trip.departureTime).getTime() > now).length,
            departedTrips: dayTrips.filter((trip) => !trip.isDraft() && !trip.isTerminal() && new Date(trip.departureTime).getTime() <= now).length,
            completedTrips: dayTrips.filter((trip) => trip.isCompleted()).length,
            cancelledTrips: dayTrips.filter((trip) => trip.isCancelled()).length,
          });
        } else {
          const result = await tripService.getTrips({
            page: pageToFetch, limit: 10,
            keyword: appliedKeyword.trim() || undefined,
            status: appliedStatus || undefined,
            departureDate: selectedDate,
            sortBy, sortOrder,
          });
          if (sequence !== requestSequence.current) return;
          setTrips(result.data);
          setKpi(result.kpi);
          setPagination(result.pagination);
        }
      } catch (err: unknown) {
        if (sequence === requestSequence.current) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách chuyến xe. Vui lòng thử lại.');
        }
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    },
    [isStaffView, user?.operatorId, appliedSort, appliedStatus, appliedKeyword, selectedDate, selectedPage]
  );

  useEffect(() => {
    setStatusFilter(appliedStatus);
    setDepartureDateFilter(selectedDate);
    setKeywordInput(appliedKeyword);
    setSortOption(appliedSort);
  }, [appliedStatus, selectedDate, appliedKeyword, appliedSort]);

  useEffect(() => {
    void fetchTrips();
    const timer = window.setInterval(() => {
      setToday(vietnamDate());
      if (document.visibilityState === 'visible') void fetchTrips(selectedPage, true);
    }, 30_000);
    const onFocus = () => { setToday(vietnamDate()); void fetchTrips(selectedPage, true); };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      requestSequence.current++;
    };
  }, [fetchTrips, selectedPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({
      page: '1', search: keywordInput.trim() || null,
      status: statusFilter || null, date: departureDateFilter || today,
      sort: sortOption !== 'departureTime_asc' ? sortOption : null,
    });
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    setStatusFilter('');
    setDepartureDateFilter(today);
    setSortOption('departureTime_asc');
    setSearchParams({});
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
      `Đã tạo chuyến xe dạng Nháp: "${newTrip.getSummaryRoute()}". Vui lòng bấm "Cấu hình & Mở bán vé" trên thẻ chuyến để chính thức mở bán cho khách đặt vé.`
    );
    const createdDate = vietnamDate(newTrip.departureTime);
    updateUrlParams({ date: createdDate, page: '1' });
    if (createdDate === selectedDate && selectedPage === 1) void fetchTrips(1);
    setTimeout(() => {
      setSuccessToast(null);
    }, 8000);
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
    departureDateFilter !== today ||
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
            : "Xem lịch chuyến theo ngày. Hệ thống tự ngừng bán khi đến giờ khởi hành, không cần xác nhận xuất bến."
        }
        actions={
          !isStaffView && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[var(--gt-brand)] hover:bg-[var(--gt-brand-hover)] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Tạo chuyến xe mới</span>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-semibold text-gray-700">
          Lịch ngày {selectedDate.split('-').reverse().join('/')} {selectedDate === today ? '· Hôm nay' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={() => updateUrlParams({ date: today, page: '1' })}>
          <CalendarClock className="mr-2 h-4 w-4" />Hôm nay
        </Button>
      </div>

      {/* Overview KPI Cards */}
      <TripKpiCards kpi={kpi} loading={loading} />

      {/* Toolbar: Search, Filters & Sort */}
      <SurfaceCard variant="glass" className="p-4 sm:p-5 rounded-[28px]">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          {/* Keyword Search Form */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Lộ trình, tên xe, biển số..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full rounded-full border border-gray-200/80 bg-white/90 py-2.5 pl-10 pr-3.5 text-xs font-semibold text-gray-900 outline-none transition focus:border-[var(--gt-brand)] focus:ring-2 focus:ring-[var(--gt-brand)]/20 shadow-2xs"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-gray-500">
                Trạng thái:
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TripStatus | "")
                }
                className="rounded-full border border-gray-200/80 bg-white/90 px-3.5 py-2 text-xs font-semibold text-gray-900 focus:border-[var(--gt-brand)] focus:outline-none shadow-2xs"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp (Chưa mở bán)</option>
                <option value="ON_SALE">Đang mở bán</option>
                <option value="STOP_SALE">Đã ngừng bán</option>
                <option value="SCHEDULED">Sắp chạy</option>
                <option value="DEPARTED">Đang chạy</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            {/* Departure Date Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-gray-500">
                Ngày:
              </span>
              <input
                type="date"
                value={departureDateFilter}
                onChange={(e) => {
                  const day = e.target.value || today;
                  setDepartureDateFilter(day);
                  updateUrlParams({ date: day, page: '1' });
                }}
                aria-label="Ngày khởi hành"
                className="rounded-full border border-gray-200/80 bg-white/90 px-3.5 py-2 text-xs font-semibold text-gray-900 focus:border-[var(--gt-brand)] focus:outline-none shadow-2xs"
              />
            </div>

            {/* Sort Control */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-gray-500">
                Sắp xếp:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-full border border-gray-200/80 bg-white/90 px-3.5 py-2 text-xs font-semibold text-gray-900 focus:border-[var(--gt-brand)] focus:outline-none shadow-2xs"
              >
                <option value="departureTime_asc">
                  Giờ khởi hành (Sớm nhất)
                </option>
                <option value="departureTime_desc">
                  Giờ khởi hành (Muộn nhất)
                </option>
                <option value="pricePerSeat_asc">Giá vé (Thấp nhất)</option>
                <option value="pricePerSeat_desc">Giá vé (Cao nhất)</option>
                <option value="createdAt_desc">Ngày tạo (Mới nhất)</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-full bg-gray-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-black shadow-2xs cursor-pointer"
            >
              Lọc
            </button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 rounded-full px-3 text-xs text-gray-500 hover:text-gray-900"
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
        <SurfaceCard variant="glass" className="p-8 rounded-[28px]">
          <LoadingState message="Đang tải danh sách các chuyến xe..." />
        </SurfaceCard>
      ) : trips.length === 0 ? (
        <SurfaceCard variant="glass" className="p-8 rounded-[28px]">
          <EmptyState
            icon={CalendarClock}
            title={
              hasActiveFilters
                ? "Không tìm thấy chuyến xe phù hợp"
                : "Chưa có chuyến xe trong ngày này"
            }
            description={
              hasActiveFilters
                ? "Thử thay đổi bộ lọc hoặc chọn ngày khác để xem lịch chuyến."
                : "Ngày đang chọn chưa có chuyến xe. Bạn có thể tạo chuyến mới hoặc chọn ngày khác để xem lịch sử."
            }
            action={
              !isStaffView ? (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="rounded-full bg-[var(--gt-brand)] hover:bg-[var(--gt-brand-hover)] text-white shadow-md shadow-brand-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Tạo chuyến xe mới</span>
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
                  managementPath={inStaffPortal ? '/staff/trips' : '/operator/trips'}
                  canManage={Boolean(user?.canManageTrips())}
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
            <SurfaceCard variant="glass" className="p-4 rounded-[28px]">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => {
                  updateUrlParams({ page: String(p) });
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
