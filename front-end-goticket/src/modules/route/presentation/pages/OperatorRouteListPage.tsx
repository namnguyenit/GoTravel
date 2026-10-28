import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { RouteEntity } from "../../domain/entity/route.entity";
import { routeService } from "../../composition";
import {
  ROUTE_STATUS,
  type RouteStatus,
} from "../../domain/value-object/route-status.vo";
import {
  PageHeader,
  SurfaceCard,
  Pagination,
  EmptyState,
  InlineAlert,
  LoadingState,
} from "@/shared/presentation/components";
import { RouteCard } from "../components/RouteCard";
import { CreateRouteModal } from "../components/CreateRouteModal";
import { ConfirmToggleRouteModal } from "../components/ConfirmToggleRouteModal";
import { ConfirmDeleteRouteModal } from "../components/ConfirmDeleteRouteModal";
import { Button } from "@/components/ui/button";
import { Plus, Search, Route as RouteIcon } from "lucide-react";

export const OperatorRouteListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestSequence = useRef(0);

  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Pagination & Filtering state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "">("");
  const [sortOption, setSortOption] = useState<string>("createdAt_desc");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [routeToEdit, setRouteToEdit] = useState<RouteEntity | null>(null);

  // Toggle Status Modal State
  const [isToggleModalOpen, setIsToggleModalOpen] = useState<boolean>(false);
  const [routeToToggle, setRouteToToggle] = useState<RouteEntity | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [routeToDelete, setRouteToDelete] = useState<RouteEntity | null>(null);
  const [isDeletingRoute, setIsDeletingRoute] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const fetchRoutes = useCallback(
    async (pageToFetch = 1, silent = false) => {
      const sequence = ++requestSequence.current;
      try {
        if (!silent) setLoading(true);
        setError(null);

        let sortBy: "createdAt" | "origin" | "destination" = "createdAt";
        let sortOrder: "asc" | "desc" = "desc";

        if (sortOption === "createdAt_desc") {
          sortBy = "createdAt";
          sortOrder = "desc";
        } else if (sortOption === "origin_asc") {
          sortBy = "origin";
          sortOrder = "asc";
        } else if (sortOption === "destination_asc") {
          sortBy = "destination";
          sortOrder = "asc";
        }

        const res = await routeService.getRoutes({
          page: pageToFetch,
          limit: pagination.limit,
          search: searchInput.trim(),
          status: statusFilter,
          sortBy,
          sortOrder,
        });

        if (sequence !== requestSequence.current) return;
        setRoutes(res.data);
        setPagination(res.pagination);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách tuyến đường.";
        if (sequence === requestSequence.current) setError(msg);
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    },
    [pagination.limit, searchInput, sortOption, statusFilter]
  );

  // Automatically open modal if ?action=new or ?action=create
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new" || action === "create") {
      setRouteToEdit(null);
      setIsModalOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchRoutes(1);
  }, [sortOption, statusFilter, fetchRoutes]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void fetchRoutes(pagination.page, true); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); requestSequence.current++; };
  }, [fetchRoutes, pagination.page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRoutes(1);
  };

  const handleOpenCreate = () => {
    setRouteToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (route: RouteEntity) => {
    setRouteToEdit(route);
    setIsModalOpen(true);
  };

  const handleRouteSaved = (savedRoute: RouteEntity) => {
    if (routeToEdit) {
      setSuccessToast(
        `Cập nhật tuyến đường "${savedRoute.getSummaryRoute()}" thành công!`
      );
      setRoutes((prev) =>
        prev.map((r) => (r.id === savedRoute.id ? savedRoute : r))
      );
    } else {
      setSuccessToast(
        `Tạo tuyến đường "${savedRoute.getSummaryRoute()}" thành công!`
      );
      setRoutes((prev) => [
        savedRoute,
        ...prev.filter((r) => r.id !== savedRoute.id),
      ]);
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
      }));
    }

    setIsModalOpen(false);
    setRouteToEdit(null);

    void fetchRoutes(routeToEdit ? pagination.page : 1);

    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Toggle status
  const handleOpenToggleStatus = (route: RouteEntity) => {
    setRouteToToggle(route);
    setToggleError(null);
    setIsToggleModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!routeToToggle || isTogglingStatus) return;

    setIsTogglingStatus(true);
    try {
      const nextStatus = routeToToggle.isActive()
        ? ROUTE_STATUS.INACTIVE
        : ROUTE_STATUS.ACTIVE;
      const updatedRoute = await routeService.updateRouteStatus(
        routeToToggle.id,
        nextStatus
      );

      setRoutes((prev) =>
        prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r))
      );

      const actionText = updatedRoute.isActive() ? "Mở khóa" : "Tạm khóa";
      setSuccessToast(
        `${actionText} tuyến "${updatedRoute.getSummaryRoute()}" thành công!`
      );
      setIsToggleModalOpen(false);
      setRouteToToggle(null);
      void fetchRoutes(pagination.page);

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Cập nhật trạng thái tuyến thất bại.";
      setError(msg);
      setToggleError(msg);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Delete route
  const handleOpenDelete = (route: RouteEntity) => {
    setRouteToDelete(route);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete || isDeletingRoute) return;

    setIsDeletingRoute(true);
    try {
      await routeService.deleteRoute(routeToDelete.id);

      setSuccessToast(
        `Xóa tuyến đường "${routeToDelete.getSummaryRoute()}" thành công!`
      );
      setRoutes((prev) => prev.filter((r) => r.id !== routeToDelete.id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      setIsDeleteModalOpen(false);
      setRouteToDelete(null);
      const remainingTotal = Math.max(0, pagination.total - 1);
      void fetchRoutes(Math.min(pagination.page, Math.max(1, Math.ceil(remainingTotal / pagination.limit))));

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Xóa tuyến đường thất bại.";
      setError(msg);
      setDeleteError(msg);
    } finally {
      setIsDeletingRoute(false);
    }
  };

  return (
    <div className="space-y-6">
      {successToast && (
        <InlineAlert
          variant="success"
          title="Thành công"
          message={successToast}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {error && (
        <InlineAlert
          variant="error"
          title="Lỗi xử lý"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Quản lý tuyến đường vận tải"
        description="Tuyến là lộ trình dùng để tạo chuyến xe. Quyền tạo chuyến và số chuyến thực tế trong ngày được hiển thị riêng bên dưới."
        eyebrow="Kênh Nhà Xe"
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-md glow-coral-sm font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo tuyến mới
          </Button>
        }
      />

      {/* Toolbar */}
      <SurfaceCard variant="glass" className="p-4 sm:p-5 rounded-[28px]">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo điểm đi, điểm đến hoặc mã tuyến..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-full border border-gray-200/80 bg-white/90 py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 outline-none transition focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RouteStatus | "")}
              className="rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none transition focus:border-[#FF385C] shadow-2xs"
            >
              <option value="">Tất cả trạng thái</option>
              <option value={ROUTE_STATUS.ACTIVE}>Cho phép tạo chuyến</option>
              <option value={ROUTE_STATUS.INACTIVE}>Đã khóa tạo chuyến</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-full border border-gray-200/80 bg-white/90 px-4 py-2.5 text-xs font-semibold text-gray-900 outline-none transition focus:border-[#FF385C] shadow-2xs"
            >
              <option value="createdAt_desc">Mới nhất trước</option>
              <option value="origin_asc">Điểm đi (A-Z)</option>
              <option value="destination_asc">Điểm đến (A-Z)</option>
            </select>

            <button
              type="submit"
              className="rounded-full bg-gray-900 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-black shadow-2xs cursor-pointer"
            >
              Lọc
            </button>
          </div>
        </form>
      </SurfaceCard>

      {/* Main List */}
      {loading ? (
        <SurfaceCard variant="glass" className="p-8 rounded-[28px]">
          <LoadingState message="Đang tải danh sách tuyến đường..." />
        </SurfaceCard>
      ) : routes.length === 0 ? (
        <SurfaceCard variant="glass" className="p-8 rounded-[28px]">
          <EmptyState
            icon={RouteIcon}
            title="Chưa có tuyến đường nào"
            description="Tạo tuyến hành trình cố định để bắt đầu lên lịch các chuyến xe hàng ngày."
            action={
              <Button
                onClick={handleOpenCreate}
                className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-md glow-coral-sm font-bold"
              >
                Tạo tuyến mới ngay
              </Button>
            }
          />
        </SurfaceCard>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {routes.map((route, idx) => (
              <RouteCard
                key={route.id}
                route={route}
                index={(pagination.page - 1) * pagination.limit + idx + 1}
                onToggleStatus={handleOpenToggleStatus}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>

          <SurfaceCard variant="glass" className="p-4 rounded-[28px]">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchRoutes(p)}
            />
          </SurfaceCard>
        </div>
      )}

      {/* Create / Edit Route Modal */}
      <CreateRouteModal
        open={isModalOpen}
        initialRoute={routeToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setRouteToEdit(null);
        }}
        onSuccess={handleRouteSaved}
      />

      {/* Toggle Status Modal */}
      <ConfirmToggleRouteModal
        open={isToggleModalOpen}
        route={routeToToggle}
        isSubmitting={isTogglingStatus}
        error={toggleError}
        onClose={() => {
          setIsToggleModalOpen(false);
          setRouteToToggle(null);
        }}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Delete Route Modal */}
      <ConfirmDeleteRouteModal
        open={isDeleteModalOpen}
        route={routeToDelete}
        isSubmitting={isDeletingRoute}
        error={deleteError}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRouteToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
