import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { carService } from "../../composition";
import { CarEntity } from "../../domain/entity/car.entity";
import type {
  CarKpiMeta,
  CarPaginationMeta,
} from "../../application/port/car.service.interface";
import type { CarType } from "../../domain/value-object/car-type.vo";
import { CarKpiCards } from "../components/CarKpiCards";
import { CarTypeBadge } from "../components/CarTypeBadge";
import { AddCarModal } from "../components/AddCarModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Plus,
  Search,
  RotateCcw,
  AlertCircle,
  Bus,
  Calendar,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
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

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Parse sortBy & sortOrder from sortOption
  const getSortParams = (option: string) => {
    switch (option) {
      case "name_asc":
        return {
          sortBy: "name" as const,
          sortOrder: "asc" as const,
        };
      case "totalSeats_asc":
        return {
          sortBy: "totalSeats" as const,
          sortOrder: "asc" as const,
        };
      case "totalSeats_desc":
        return {
          sortBy: "totalSeats" as const,
          sortOrder: "desc" as const,
        };
      case "createdAt_desc":
      default:
        return {
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
        };
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

  const handleResetFilters = () => {
    setKeywordInput("");
    setSelectedType("");
    setSortOption("createdAt_desc");
  };

  const handleCarCreated = (newCar: CarEntity) => {
    setSuccessToast(`Thêm xe "${newCar.name}" thành công!`);
    // Prepend new car to front of list
    setCars((prev) => [newCar, ...prev.filter((c) => c.id !== newCar.id)]);
    // Update KPI
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
              Quản lý đội xe khách
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
            Theo dõi, phân loại và đăng ký mới các phương tiện xe khách phục vụ
            bán vé.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm xe mới</span>
        </Button>
      </div>

      {/* 4 KPI Cards */}
      <CarKpiCards kpi={kpi} loading={loading} />

      {/* Toolbar: Search, Filters, Sorters */}
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
              placeholder="Tìm theo tên xe, biển số..."
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
            Tìm
          </Button>
        </form>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Car Type Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-gray-500">Loại xe:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">Tất cả loại xe</option>
              <option value="SLEEPER">Xe giường nằm</option>
              <option value="LIMOUSINE">Xe Limousine</option>
              <option value="SEAT">Xe ghế ngồi</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-gray-500">Sắp xếp:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="createdAt_desc">Mới nhất</option>
              <option value="name_asc">Tên xe (A-Z)</option>
              <option value="totalSeats_asc">Số ghế (Tăng dần)</option>
              <option value="totalSeats_desc">Số ghế (Giảm dần)</option>
            </select>
          </div>

          {(keywordInput ||
            selectedType ||
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
            onClick={() => fetchCars()}
            className="border-red-200 bg-white text-xs text-red-700 hover:bg-red-50"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Car List Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 uppercase">
              <tr>
                <th className="py-3.5 pr-3 pl-4">STT</th>
                <th className="px-4 py-3.5">Tên xe</th>
                <th className="px-4 py-3.5">Biển số</th>
                <th className="px-4 py-3.5">Loại xe</th>
                <th className="px-4 py-3.5 text-center">Tổng số ghế</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 pr-3 pl-4">
                      <div className="h-4 w-6 rounded bg-gray-200"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-48 rounded bg-gray-200"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-24 rounded bg-gray-200"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 w-20 rounded bg-gray-200"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="mx-auto h-4 w-10 rounded bg-gray-200"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="mx-auto h-5 w-24 rounded bg-gray-200"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-28 rounded bg-gray-200"></div>
                    </td>
                  </tr>
                ))
              ) : cars.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-blue-50 p-4 text-blue-600">
                        <Bus className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {keywordInput || selectedType
                            ? "Không tìm thấy xe phù hợp"
                            : "Chưa có xe nào trong hệ thống"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {keywordInput || selectedType
                            ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc để xem các xe khác."
                            : "Bắt đầu đăng ký phương tiện xe khách đầu tiên cho nhà xe của bạn."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddModalOpen(true)}
                        className="gap-1.5 bg-blue-600 font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Thêm xe mới</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data Rows
                cars.map((car, index) => {
                  const itemIndex =
                    (pagination.page - 1) * pagination.limit + index + 1;
                  const statusBadge = car.getStatusBadgeClasses();

                  return (
                    <tr
                      key={car.id}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      {/* STT */}
                      <td className="py-3.5 pr-3 pl-4 font-mono text-[11px] text-gray-500">
                        #{itemIndex}
                      </td>

                      {/* Tên xe */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="rounded-md bg-blue-50 p-1.5 text-blue-600">
                            <Car className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              {car.name}
                            </span>
                            <div className="font-mono text-[10px] text-gray-400">
                              {car.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Biển số xe */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1 font-mono text-xs font-bold text-gray-800">
                          {car.licensePlate}
                        </span>
                      </td>

                      {/* Loại xe */}
                      <td className="px-4 py-3.5">
                        <CarTypeBadge type={car.type} />
                      </td>

                      {/* Tổng số ghế */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                          <Users className="h-3 w-3 text-gray-500" />
                          <span>{car.totalSeats} chỗ</span>
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant="outline"
                          className={`font-semibold ${statusBadge.border} ${statusBadge.bg} ${statusBadge.text}`}
                        >
                          {car.getStatusDisplayName()}
                        </Badge>
                      </td>

                      {/* Ngày tạo */}
                      <td className="px-4 py-3.5">
                        <span className="flex items-center space-x-1 text-gray-500">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>{car.getFormattedCreatedAt()}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 sm:flex-row">
          <div>
            Hiển thị{" "}
            <span className="font-semibold text-gray-900">
              {cars.length > 0
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-gray-900">
              {(pagination.page - 1) * pagination.limit + cars.length}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-semibold text-gray-900">
              {pagination.totalItems}
            </span>{" "}
            xe
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchCars(pagination.page - 1)}
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
              onClick={() => fetchCars(pagination.page + 1)}
              className="h-8 text-xs"
            >
              <span>Sau</span>
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Car Modal */}
      <AddCarModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleCarCreated}
      />
    </div>
  );
};
