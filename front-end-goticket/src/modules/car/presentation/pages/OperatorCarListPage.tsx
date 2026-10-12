import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { carService } from "../../composition";
import { CarEntity } from "../../domain/entity/car.entity";
import type {
  CarKpiMeta,
  CarPaginationMeta,
} from "../../application/port/car.service.interface";
import type { CarType } from "../../domain/value-object/car-type.vo";
import type { CarStatus } from "../../domain/value-object/car-status.vo";
import { CarKpiCards } from "../components/CarKpiCards";
import { CarTypeBadge } from "../components/CarTypeBadge";
import { AddCarModal } from "../components/AddCarModal";
import {
  PageHeader,
  SurfaceCard,
  StatusBadge,
  ConfirmDialog,
  InlineAlert,
  LoadingState,
  EmptyState,
  Pagination,
  Button,
} from "@/shared/presentation/components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Bus,
  Grid3X3,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const OperatorCarListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cars, setCars] = useState<CarEntity[]>([]);
  const [kpi, setKpi] = useState<CarKpiMeta>({
    totalCars: 0,
    sleeperCars: 0,
    limousineCars: 0,
    seatCars: 0,
  });
  const [pagination, setPagination] = useState<CarPaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("createdAt_desc");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [updatingCarId, setUpdatingCarId] = useState<string | null>(null);

  // Edit dialog state (replacing window.prompt)
  const [editingCar, setEditingCar] = useState<CarEntity | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editPlate, setEditPlate] = useState<string>("");

  // Status confirm dialog state (replacing window.confirm)
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    car: CarEntity;
    nextStatus: CarStatus;
  } | null>(null);

  // Parse sortBy & sortOrder from sortOption
  const getSortParams = (option: string) => {
    switch (option) {
      case "name_asc":
        return { sortBy: "name" as const, sortOrder: "asc" as const };
      case "totalSeats_asc":
        return { sortBy: "totalSeats" as const, sortOrder: "asc" as const };
      case "totalSeats_desc":
        return { sortBy: "totalSeats" as const, sortOrder: "desc" as const };
      case "createdAt_desc":
      default:
        return { sortBy: "createdAt" as const, sortOrder: "desc" as const };
    }
  };

  const fetchCars = useCallback(
    async (pageToFetch = pagination.page) => {
      setLoading(true);
      setError(null);

      const { sortBy, sortOrder } = getSortParams(sortOption);

      try {
        const res = await carService.getCars({
          page: pageToFetch,
          limit: pagination.limit,
          keyword: keywordInput,
          type: selectedType as CarType | "",
          sortBy,
          sortOrder,
        });

        setCars(res.data);
        setKpi(res.kpi);
        setPagination(res.pagination);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách phương tiện.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, keywordInput, selectedType, sortOption]
  );

  // Automatically open modal if ?action=new or ?action=add
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new" || action === "add") {
      setIsAddModalOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchCars(1);
  }, [selectedType, sortOption, fetchCars]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCars(1);
  };

  const handleCarCreated = (newCar: CarEntity) => {
    setSuccessToast(`Thêm xe "${newCar.name}" thành công!`);
    setCars((prev) => [newCar, ...prev.filter((c) => c.id !== newCar.id)]);
    setKpi((prev) => ({
      ...prev,
      totalCars: prev.totalCars + 1,
      sleeperCars:
        newCar.type === "SLEEPER" ? prev.sleeperCars + 1 : prev.sleeperCars,
      limousineCars:
        newCar.type === "LIMOUSINE"
          ? prev.limousineCars + 1
          : prev.limousineCars,
      seatCars: newCar.type === "SEAT" ? prev.seatCars + 1 : prev.seatCars,
    }));
    setPagination((prev) => ({
      ...prev,
      totalItems: prev.totalItems + 1,
    }));

    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const openEditDialog = (car: CarEntity) => {
    setEditingCar(car);
    setEditName(car.name);
    setEditPlate(car.licensePlate);
  };

  const submitEditCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar || !editName.trim() || !editPlate.trim()) return;

    setUpdatingCarId(editingCar.id);
    setError(null);
    try {
      const updated = await carService.updateCar(editingCar.id, {
        name: editName.trim(),
        licensePlate: editPlate.trim().toUpperCase(),
        type: editingCar.type,
      });
      setCars((items) =>
        items.map((item) => (item.id === updated.id ? updated : item))
      );
      setSuccessToast(`Đã cập nhật xe "${updated.name}".`);
      setEditingCar(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể cập nhật xe."
      );
    } finally {
      setUpdatingCarId(null);
    }
  };

  const executeStatusChange = async () => {
    if (!statusConfirmTarget) return;
    const { car, nextStatus } = statusConfirmTarget;
    setUpdatingCarId(car.id);
    setError(null);
    try {
      const updated = await carService.updateCarStatus(car.id, nextStatus);
      setCars((items) =>
        items.map((item) => (item.id === updated.id ? updated : item))
      );
      setSuccessToast(`Đã chuyển trạng thái xe sang "${nextStatus}".`);
      setStatusConfirmTarget(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể đổi trạng thái xe."
      );
    } finally {
      setUpdatingCarId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Page Header */}
      <PageHeader
        title="Quản lý đội xe khách"
        description="Theo dõi, phân loại và đăng ký mới các phương tiện xe khách phục vụ bán vé liên tỉnh."
        eyebrow="Kênh Nhà Xe"
        actions={
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm xe mới
          </Button>
        }
      />

      {/* 4 KPI Cards */}
      <CarKpiCards kpi={kpi} loading={loading} />

      {/* Toolbar: Search & Filters */}
      <SurfaceCard className="p-4 sm:p-5">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-[var(--gt-muted)]" />
            <input
              type="text"
              placeholder="Tìm theo tên xe, biển số..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full rounded-2xl border border-[var(--gt-border)] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)] focus:ring-2 focus:ring-[var(--gt-coral-soft)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
            >
              <option value="">Tất cả loại xe</option>
              <option value="SLEEPER">Xe giường nằm</option>
              <option value="LIMOUSINE">Xe Limousine</option>
              <option value="SEAT">Xe ghế ngồi</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
            >
              <option value="createdAt_desc">Mới nhất trước</option>
              <option value="name_asc">Tên xe (A-Z)</option>
              <option value="totalSeats_desc">Số ghế (Cao đến thấp)</option>
              <option value="totalSeats_asc">Số ghế (Thấp đến cao)</option>
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

      {/* Main List / Table */}
      {loading ? (
        <SurfaceCard className="p-8">
          <LoadingState message="Đang tải danh sách đội xe..." />
        </SurfaceCard>
      ) : cars.length === 0 ? (
        <SurfaceCard className="p-8">
          <EmptyState
            icon={Bus}
            title="Chưa tìm thấy xe nào"
            description="Bạn chưa đăng ký xe hoặc không có xe nào khớp với bộ lọc tìm kiếm hiện tại."
            action={
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#FF385C] hover:bg-[#E61E4F] text-white"
              >
                Đăng ký xe mới ngay
              </Button>
            }
          />
        </SurfaceCard>
      ) : (
        <SurfaceCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--gt-border-soft)] bg-[var(--gt-surface-soft)] text-[11px] font-bold uppercase tracking-wider text-[var(--gt-muted)]">
                  <th className="py-3.5 px-5">Tên xe & Phương tiện</th>
                  <th className="py-3.5 px-5">Biển số</th>
                  <th className="py-3.5 px-5">Phân loại xe</th>
                  <th className="py-3.5 px-5 text-center">Tổng số ghế</th>
                  <th className="py-3.5 px-5 text-center">Trạng thái</th>
                  <th className="py-3.5 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gt-border-soft)]">
                {cars.map((car) => (
                  <tr
                    key={car.id}
                    className="hover:bg-[var(--gt-surface-soft)]/50 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gt-coral-soft)] text-[var(--gt-coral)] shrink-0">
                          <Bus className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[var(--gt-ink)]">
                            {car.name}
                          </p>
                          <p className="text-[11px] text-[var(--gt-muted)] font-mono">
                            ID: {car.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 font-mono font-bold text-sm text-[var(--gt-ink)]">
                      {car.licensePlate}
                    </td>

                    <td className="py-4 px-5">
                      <CarTypeBadge type={car.type} />
                    </td>

                    <td className="py-4 px-5 text-center font-bold text-sm tabular-nums text-[var(--gt-ink)]">
                      {car.totalSeats} ghế
                    </td>

                    <td className="py-4 px-5 text-center">
                      <StatusBadge status={car.status} />
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/operator/cars/${car.id}/seats`}
                          className="inline-flex items-center gap-1 rounded-xl border border-[var(--gt-border)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--gt-ink)] transition hover:border-[var(--gt-coral)] hover:text-[var(--gt-coral)]"
                          title="Cấu hình sơ đồ ghế"
                        >
                          <Grid3X3 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Sơ đồ ghế</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => openEditDialog(car)}
                          className="rounded-xl border border-[var(--gt-border)] bg-white p-1.5 text-[var(--gt-muted)] transition hover:text-[var(--gt-ink)] hover:border-gray-400"
                          title="Sửa thông tin xe"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <select
                          value={car.status}
                          disabled={updatingCarId === car.id}
                          onChange={(e) =>
                            setStatusConfirmTarget({
                              car,
                              nextStatus: e.target.value as CarStatus,
                            })
                          }
                          className="rounded-xl border border-[var(--gt-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--gt-ink)] outline-none"
                        >
                          <option value="ACTIVE">Hoạt động</option>
                          <option value="MAINTENANCE">Bảo trì</option>
                          <option value="INACTIVE">Ngưng chạy</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-[var(--gt-border-soft)] p-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchCars(p)}
            />
          </div>
        </SurfaceCard>
      )}

      {/* Add Car Modal */}
      <AddCarModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleCarCreated}
      />

      {/* Edit Car Dialog (replaces window.prompt) */}
      <Dialog
        open={Boolean(editingCar)}
        onOpenChange={(isOpen) => !isOpen && setEditingCar(null)}
      >
        <DialogContent className="max-w-md rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--gt-ink)]">
              Chỉnh sửa thông tin xe khách
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submitEditCar} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Tên hiển thị xe <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gt-muted)]">
                Biển số kiểm soát <span className="text-[var(--gt-coral)]">*</span>
              </label>
              <input
                required
                value={editPlate}
                onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-[var(--gt-border)] bg-white px-3.5 py-2.5 font-mono text-sm font-semibold text-[var(--gt-ink)] outline-none transition focus:border-[var(--gt-coral)]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingCar(null)}
                className="rounded-2xl border border-[var(--gt-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--gt-muted)] hover:bg-[var(--gt-surface-soft)]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={Boolean(updatingCarId)}
                className="btn-coral px-5 py-2 text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {updatingCarId ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirm Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={Boolean(statusConfirmTarget)}
        onOpenChange={(isOpen) => !isOpen && setStatusConfirmTarget(null)}
        title="Xác nhận chuyển trạng thái xe"
        description={`Bạn có chắc muốn chuyển trạng thái xe "${statusConfirmTarget?.car.name}" (${statusConfirmTarget?.car.licensePlate}) sang trạng thái "${statusConfirmTarget?.nextStatus}"?`}
        confirmLabel="Xác nhận đổi"
        variant={
          statusConfirmTarget?.nextStatus === "INACTIVE"
            ? "danger"
            : statusConfirmTarget?.nextStatus === "MAINTENANCE"
            ? "warning"
            : "primary"
        }
        loading={Boolean(updatingCarId)}
        onConfirm={executeStatusChange}
      />
    </div>
  );
};
