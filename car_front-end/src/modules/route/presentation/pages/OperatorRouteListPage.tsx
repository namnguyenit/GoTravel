import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { routeService } from "../../composition";
import { RouteEntity } from "../../domain/entity/route.entity";
import {
  type RouteStatus,
  ROUTE_STATUS,
  RouteStatusVO,
} from "../../domain/value-object/route-status.vo";
import type { RoutePaginationMeta } from "../../application/port/route.service.interface";
import { RouteCard } from "../components/RouteCard";
import { CreateRouteModal } from "../components/CreateRouteModal";
import { ConfirmToggleRouteModal } from "../components/ConfirmToggleRouteModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Waypoints,
  Lock,
} from "lucide-react";

export const OperatorRouteListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [pagination, setPagination] = useState<RoutePaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchInput, setSearchInput] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("createdAt_desc");
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "">("");

  // Modal & Toast state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [routeToToggle, setRouteToToggle] = useState<RouteEntity | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState<boolean>(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const getSortParams = (option: string) => {
    switch (option) {
      case "origin_asc":
        return {
          sortBy: "origin" as const,
          sortOrder: "asc" as const,
        };
      case "destination_asc":
        return {
          sortBy: "destination" as const,
          sortOrder: "asc" as const,
        };
      case "createdAt_desc":
      default:
        return {
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
        };
    }
  };

  const fetchRoutes = useCallback(
    async (pageToFetch = pagination.page) => {
      setLoading(true);
      setError(null);

      const { sortBy, sortOrder } = getSortParams(sortOption);

      try {
        const res = await routeService.getRoutes({
          page: pageToFetch,
          limit: pagination.limit,
          search: searchInput,
          status: statusFilter || undefined,
          sortBy,
          sortOrder,
        });

        setRoutes(res.data);
        setPagination(res.pagination);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách tuyến đường.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, searchInput, sortOption, statusFilter]
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
    fetchRoutes(1);
  }, [sortOption, statusFilter, fetchRoutes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRoutes(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSortOption("createdAt_desc");
    setStatusFilter("");
  };

  const handleRouteCreated = (newRoute: RouteEntity) => {
    setSuccessToast(
      `Tạo tuyến đường "${newRoute.getSummaryRoute()}" thành công!`
    );
    // Prepend new route to front of list
    setRoutes((prev) => [
      newRoute,
      ...prev.filter((r) => r.id !== newRoute.id),
    ]);
    setPagination((prev) => ({
      ...prev,
      total: prev.total + 1,
    }));

    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const handleOpenToggleModal = (route: RouteEntity) => {
    setRouteToToggle(route);
    setIsToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!routeToToggle) return;

    setIsTogglingStatus(true);
    try {
      const nextStatus = RouteStatusVO.getOppositeStatus(routeToToggle.status);
      const updatedRoute = await routeService.updateRouteStatus(
        routeToToggle.id,
        nextStatus
      );

      // Optimistically update list
      setRoutes((prev) =>
        prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r))
      );

      const successMsg =
        nextStatus === ROUTE_STATUS.INACTIVE
          ? `Đã khóa tuyến đường "${updatedRoute.getSummaryRoute()}" thành công.`
          : `Đã kích hoạt lại tuyến đường "${updatedRoute.getSummaryRoute()}" thành công.`;
      setSuccessToast(successMsg);
      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);

      setIsToggleModalOpen(false);
      setRouteToToggle(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái tuyến đường.";
      setError(msg);
    } finally {
      setIsTogglingStatus(false);
    }
  };

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
              Quản lý Tuyến đường
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
            Thiết lập mạng lưới các tuyến vận chuyển hành khách và trạm dừng
            đón/trả của nhà xe.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo tuyến đường mới</span>
        </Button>
      </div>

      {/* Overview Stat Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-white p-4 shadow-xs">
          <div>
            <span className="text-xs font-medium text-gray-500">
              Tổng số tuyến đường
            </span>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                pagination.total.toLocaleString("vi-VN")
              )}
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white p-4 shadow-xs">
          <div>
            <span className="text-xs font-medium text-gray-500">
              Đang hoạt động trên trang
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-600">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                routes
                  .filter((r) => r.isActive())
                  .length.toLocaleString("vi-VN")
              )}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
            <Waypoints className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-white p-4 shadow-xs">
          <div>
            <span className="text-xs font-medium text-gray-500">
              Tạm ngừng trên trang
            </span>
            <div className="mt-1 text-2xl font-bold text-amber-600">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-gray-200" />
              ) : (
                routes
                  .filter((r) => r.isInactive())
                  .length.toLocaleString("vi-VN")
              )}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
            <Lock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Sort & Status Filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        {/* Search form */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-1 items-center space-x-2"
        >
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm theo điểm đi, điểm đến..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-gray-500">
              Trạng thái:
            </span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RouteStatus | "")
              }
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Tạm ngừng</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-gray-500">Sắp xếp:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="createdAt_desc">Mới nhất (Mặc định)</option>
              <option value="origin_asc">Điểm khởi hành (A-Z)</option>
              <option value="destination_asc">Điểm đến (A-Z)</option>
            </select>
          </div>

          {(searchInput ||
            statusFilter !== "" ||
            sortOption !== "createdAt_desc") && (
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
            onClick={() => fetchRoutes()}
            className="border-red-200 bg-white text-xs text-red-700 hover:bg-red-50"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Routes List Section */}
      {loading ? (
        // Loading Skeleton
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-xs"
            >
              <div className="h-5 w-1/3 rounded bg-gray-200" />
              <div className="h-4 w-1/4 rounded bg-gray-200" />
              <div className="h-12 w-full rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        // Empty State
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center shadow-xs">
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-blue-50 p-4 text-blue-600">
              <MapPin className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-gray-800">
                {searchInput
                  ? "Không tìm thấy tuyến đường phù hợp"
                  : "Chưa có tuyến đường nào trong hệ thống"}
              </p>
              <p className="text-xs text-gray-500">
                {searchInput
                  ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc để xem các tuyến khác."
                  : "Bắt đầu thiết lập mạng lưới lộ trình xe khách đầu tiên cho nhà xe của bạn."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo tuyến đường đầu tiên</span>
            </Button>
          </div>
        </div>
      ) : (
        // Route Cards List
        <div className="space-y-4">
          {routes.map((route, index) => {
            const itemIndex =
              (pagination.page - 1) * pagination.limit + index + 1;
            return (
              <RouteCard
                key={route.id}
                route={route}
                index={itemIndex}
                onToggleStatus={handleOpenToggleModal}
              />
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-xs sm:flex-row">
          <div>
            Hiển thị{" "}
            <span className="font-semibold text-gray-900">
              {routes.length > 0
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-gray-900">
              {(pagination.page - 1) * pagination.limit + routes.length}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-semibold text-gray-900">
              {pagination.total}
            </span>{" "}
            tuyến
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchRoutes(pagination.page - 1)}
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
              onClick={() => fetchRoutes(pagination.page + 1)}
              className="h-8 text-xs"
            >
              <span>Sau</span>
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Route Modal */}
      <CreateRouteModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRouteCreated}
      />

      {/* Confirm Toggle Route Status Modal */}
      <ConfirmToggleRouteModal
        open={isToggleModalOpen}
        route={routeToToggle}
        isSubmitting={isTogglingStatus}
        onClose={() => {
          setIsToggleModalOpen(false);
          setRouteToToggle(null);
        }}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
};
