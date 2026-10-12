import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { routeService } from "../../composition";
import { RouteEntity } from "../../domain/entity/route.entity";
import {
  type RouteStatus,
  ROUTE_STATUS,
} from "../../domain/value-object/route-status.vo";
import type { RoutePaginationMeta } from "../../application/port/route.service.interface";
import { RouteCard } from "../components/RouteCard";
import { CreateRouteModal } from "../components/CreateRouteModal";
import { ConfirmToggleRouteModal } from "../components/ConfirmToggleRouteModal";
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
  Plus,
  Search,
  Route as RouteIcon,
  Filter,
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
        return { sortBy: "origin" as const, sortOrder: "asc" as const };
      case "destination_asc":
        return { sortBy: "destination" as const, sortOrder: "asc" as const };
      case "createdAt_desc":
      default:
        return { sortBy: "createdAt" as const, sortOrder: "desc" as const };
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

  const handleRouteCreated = (newRoute: RouteEntity) => {
    setSuccessToast(
      `Tạo tuyến đường "${newRoute.getSummaryRoute()}" thành công!`
    );
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

  const handleOpenToggleStatus = (route: RouteEntity) => {
    setRouteToToggle(route);
    setIsToggleModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!routeToToggle) return;

    setIsTogglingStatus(true);
    try {
      const nextStatus = routeToToggle.isActive() ? ROUTE_STATUS.INACTIVE : ROUTE_STATUS.ACTIVE;
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

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Cập nhật trạng thái tuyến thất bại.";
      setError(msg);
    } finally {
      setIsTogglingStatus(false);
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
        description="Thiết lập các tuyến xe cố định, cấu hình lộ trình điểm đón/trả và trạng thái mở bán."
        eyebrow="Kênh Nhà Xe"
        actions={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo tuyến mới
          </Button>
        }
      />

      {/* Toolbar */}
      <SurfaceCard className="p-4 sm:p-5">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-[var(--gt-muted)]" />
            <input
              type="text"
              placeholder="Tìm theo điểm đi, điểm đến hoặc mã tuyến..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-2xl border border-[var(--gt-border)] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RouteStatus | "")}
              className="rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value={ROUTE_STATUS.ACTIVE}>Đang hoạt động</option>
              <option value={ROUTE_STATUS.INACTIVE}>Tạm khóa</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
            >
              <option value="createdAt_desc">Mới nhất trước</option>
              <option value="origin_asc">Điểm đi (A-Z)</option>
              <option value="destination_asc">Điểm đến (A-Z)</option>
            </select>

            <button
              type="submit"
              className="rounded-2xl bg-[var(--gt-ink)] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-black"
            >
              Lọc
            </button>
          </div>
        </form>
      </SurfaceCard>

      {/* Main List */}
      {loading ? (
        <SurfaceCard className="p-8">
          <LoadingState message="Đang tải danh sách tuyến đường..." />
        </SurfaceCard>
      ) : routes.length === 0 ? (
        <SurfaceCard className="p-8">
          <EmptyState
            icon={RouteIcon}
            title="Chưa có tuyến đường nào"
            description="Tạo tuyến hành trình cố định để bắt đầu lên lịch các chuyến xe hàng ngày."
            action={
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
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
              />
            ))}
          </div>

          <SurfaceCard className="p-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchRoutes(p)}
            />
          </SurfaceCard>
        </div>
      )}

      {/* Create Route Modal */}
      <CreateRouteModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRouteCreated}
      />

      {/* Toggle Status Modal */}
      <ConfirmToggleRouteModal
        open={isToggleModalOpen}
        route={routeToToggle}
        isSubmitting={isTogglingStatus}
        onClose={() => {
          setIsToggleModalOpen(false);
          setRouteToToggle(null);
        }}
        onConfirm={handleConfirmToggleStatus}
      />
    </div>
  );
};
