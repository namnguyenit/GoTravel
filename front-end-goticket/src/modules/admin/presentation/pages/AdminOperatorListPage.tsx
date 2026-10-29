import React, { useEffect, useState, useRef } from "react";
import { adminOperatorService } from "../../composition";
import type { OperatorEntity } from "../../domain/entity/operator.entity";
import type { PaginationMeta } from "../../application/port/admin-operator.service.interface";
import {
  PageHeader,
  MetricCard,
  SurfaceCard,
  StatusBadge,
  Button,
  IdText,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Pagination,
} from "@/shared/presentation/components";
import {
  Building2,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  User,
  Eye,
  Power,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { AdminUserDetailModal } from "../components/AdminUserDetailModal";

export const AdminOperatorListPage: React.FC = () => {
  const sequence = useRef(0); const changing = useRef(false);
  const [operators, setOperators] = useState<OperatorEntity[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Modal xem chi tiết User
  const [selectedUserForModal, setSelectedUserForModal] = useState<{
    userId: string;
    operatorName: string;
  } | null>(null);

  // Confirm dialog state for toggle status
  const [operatorToToggle, setOperatorToToggle] = useState<OperatorEntity | null>(null);
  const [updatingOperatorId, setUpdatingOperatorId] = useState<string | null>(null);

  const fetchOperators = async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const res = await adminOperatorService.getOperators({
        search: searchQuery || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      if (sequence.current !== current) return;
      setOperators(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi tải danh sách nhà xe";
      if (sequence.current === current) setError(msg);
    } finally {
      if (sequence.current === current) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOperators();
    return () => { sequence.current++; };
  }, [searchQuery, page, limit, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchTerm.trim());
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchQuery("");
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPage(1);
    if (val === "newest") {
      setSortBy("createdAt");
      setSortOrder("desc");
    } else if (val === "oldest") {
      setSortBy("createdAt");
      setSortOrder("asc");
    } else if (val === "name_asc") {
      setSortBy("name");
      setSortOrder("asc");
    } else if (val === "name_desc") {
      setSortBy("name");
      setSortOrder("desc");
    }
  };

  const handleConfirmToggle = async () => {
    if (!operatorToToggle || changing.current) return;
    changing.current = true;
    const next = operatorToToggle.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const wording = next === "SUSPENDED" ? "đình chỉ" : "kích hoạt lại";
    setUpdatingOperatorId(operatorToToggle.id);
    setError(null);
    try {
      await adminOperatorService.updateOperatorStatus(operatorToToggle.id, next);
      setOperatorToToggle(null);
      await fetchOperators();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Không thể ${wording} nhà xe.`);
    } finally {
      changing.current = false; setUpdatingOperatorId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title="Quản lý Đối tác Nhà xe"
        eyebrow="Hệ thống Vận tải Toàn quốc"
        description="Theo dõi danh sách các đơn vị vận tải đã đăng ký, quản lý trạng thái hoạt động và tra cứu tài khoản chủ sở hữu."
        breadcrumbs={[
          { label: "Admin GoTicket", to: "/admin" },
          { label: "Đối tác Nhà xe" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOperators}
            disabled={loading}
            className="rounded-full border-white/80 bg-white/80 backdrop-blur-md shadow-xs gap-2 px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Tổng số nhà xe"
          value={pagination.total}
          subtext="Doanh nghiệp vận tải liên kết"
          icon={Building2}
          variant="default"
        />
        <MetricCard
          label="Đang hoạt động"
          value={operators.filter((op) => op.status === "ACTIVE").length}
          subtext="Nhà xe trang thái ACTIVE trên trang"
          icon={ShieldCheck}
          variant="emerald"
        />
        <MetricCard
          label="Đã đình chỉ"
          value={operators.filter((op) => op.status === "SUSPENDED").length}
          subtext="Tạm ngừng do kiểm tra hoặc vi phạm"
          icon={AlertCircle}
          variant={operators.some((op) => op.status === "SUSPENDED") ? "coral" : "default"}
        />
      </div>

      {/* Search & Filter Bar */}
      <SurfaceCard className="p-4 sm:p-5 rounded-[28px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 items-center gap-2 max-w-xl"
          >
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3.5 h-4 w-4 text-[var(--gt-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên nhà xe..."
                className="w-full h-10 pl-10 pr-8 text-xs sm:text-sm bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-brand)] focus:ring-4 focus:ring-[var(--gt-brand)]/10 focus:outline-none transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-3 text-[var(--gt-muted)] hover:text-[var(--gt-ink)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              className="rounded-full px-5 h-10 bg-[var(--gt-brand)] hover:bg-[var(--gt-brand-hover)] text-white shadow-brand-sm font-bold text-xs"
            >
              Tìm kiếm
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="rounded-full text-xs h-10 px-3.5"
              >
                Xóa lọc
              </Button>
            )}
          </form>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--gt-muted)]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Sắp xếp:</span>
              <select
                aria-label="Sắp xếp danh sách nhà xe"
                onChange={handleSortChange}
                value={
                  sortBy === "createdAt" && sortOrder === "desc"
                    ? "newest"
                    : sortBy === "createdAt" && sortOrder === "asc"
                      ? "oldest"
                      : sortBy === "name" && sortOrder === "asc"
                        ? "name_asc"
                        : "name_desc"
                }
                className="h-9 rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-3 text-xs font-semibold text-[var(--gt-ink)] focus:border-[var(--gt-brand)] outline-none shadow-xs"
              >
                <option value="newest">Ngày tạo: Mới nhất</option>
                <option value="oldest">Ngày tạo: Cũ nhất</option>
                <option value="name_asc">Tên nhà xe: A - Z</option>
                <option value="name_desc">Tên nhà xe: Z - A</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--gt-muted)]">
              <span>Hiển thị:</span>
              <select
                aria-label="Số bản ghi trên mỗi trang"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-3 text-xs font-semibold text-[var(--gt-ink)] focus:border-[var(--gt-brand)] outline-none shadow-xs"
              >
                <option value={10}>10 bản ghi</option>
                <option value={20}>20 bản ghi</option>
                <option value={50}>50 bản ghi</option>
              </select>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Error Alert */}
      {error && (
        <div className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 backdrop-blur-md p-4 text-xs sm:text-sm text-rose-800 flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-7 text-xs text-rose-800 rounded-full">
            Đóng
          </Button>
        </div>
      )}

      {/* Operator Data View */}
      <SurfaceCard className="p-0 overflow-hidden rounded-[32px]">
        <div className="p-5 sm:p-6 border-b border-[var(--gt-border)]/60 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-[var(--gt-ink)]">
              Danh sách Nhà xe ({pagination.total})
            </h2>
            <p className="text-xs text-[var(--gt-muted)] mt-0.5">
              {searchQuery
                ? `Kết quả tìm kiếm cho từ khóa "${searchQuery}"`
                : "Danh sách tất cả các đơn vị vận tải đã được phê duyệt"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-14">
            <LoadingState message="Đang tải danh sách nhà xe..." />
          </div>
        ) : operators.length === 0 ? (
          <div className="p-14">
            <EmptyState
              title={searchQuery ? "Không tìm thấy nhà xe" : "Chưa có nhà xe nào"}
              description={
                searchQuery
                  ? "Không có nhà xe nào phù hợp với từ khóa tìm kiếm của bạn."
                  : "Chưa có đối tác nhà xe nào hoạt động trên hệ thống GoTicket."
              }
              action={
                searchQuery ? (
                  <Button variant="outline" size="sm" onClick={handleClearSearch} className="rounded-full text-xs">
                    Xóa bộ lọc tìm kiếm
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--gt-border)]/60 bg-white/50 backdrop-blur-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-4">STT</th>
                    <th className="px-5 py-4">Nhà xe</th>
                    <th className="px-5 py-4">Mã Nhà xe</th>
                    <th className="px-5 py-4">Chủ sở hữu (User ID)</th>
                    <th className="px-5 py-4">Ngày tham gia</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {operators.map((op, idx) => {
                    const stt = (pagination.page - 1) * pagination.limit + idx + 1;
                    return (
                      <tr key={op.id} className="hover:bg-white/60 transition-colors">
                        <td className="px-5 py-4 font-bold text-[var(--gt-muted)]">
                          {stt}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-[var(--gt-brand-soft)]/80 text-[var(--gt-brand)] flex items-center justify-center shrink-0 shadow-xs">
                              <Building2 className="w-4.5 h-4.5" />
                            </div>
                            <span className="font-bold text-[var(--gt-ink)] text-sm">
                              {op.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <IdText id={op.id} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <IdText id={op.userId} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-[var(--gt-brand)] hover:bg-[var(--gt-brand-soft)] rounded-full gap-1 font-semibold"
                              onClick={() =>
                                setSelectedUserForModal({
                                  userId: op.userId,
                                  operatorName: op.name,
                                })
                              }
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </Button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[var(--gt-muted)]">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-[var(--gt-muted)]/80" />
                            <span>{op.getFormattedCreatedAt()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={op.status}
                            label={op.status === "ACTIVE" ? "Đang hoạt động" : op.status === "SUSPENDED" ? "Đã đình chỉ" : "Ngừng hoạt động"}
                          />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updatingOperatorId === op.id}
                            onClick={() => setOperatorToToggle(op)}
                            className={
                              op.status === "ACTIVE"
                                ? "rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-3.5 py-1.5 font-bold shadow-xs"
                                : "rounded-full border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 text-xs px-3.5 py-1.5 font-bold shadow-xs"
                            }
                          >
                            <Power className="mr-1.5 h-3.5 w-3.5" />
                            <span>{op.status === "ACTIVE" ? "Đình chỉ" : "Kích hoạt"}</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="block lg:hidden divide-y divide-white/60">
              {operators.map((op, idx) => {
                const stt = (pagination.page - 1) * pagination.limit + idx + 1;
                return (
                  <div key={op.id} className="p-4 sm:p-5 space-y-3 hover:bg-white/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[var(--gt-muted)] w-5">#{stt}</span>
                        <div className="w-9 h-9 rounded-2xl bg-[var(--gt-brand-soft)]/80 text-[var(--gt-brand)] flex items-center justify-center shrink-0 shadow-xs">
                          <Building2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[var(--gt-ink)]">{op.name}</h3>
                          <IdText id={op.id} />
                        </div>
                      </div>
                      <StatusBadge
                        status={op.status}
                        label={op.status === "ACTIVE" ? "Đang hoạt động" : op.status === "SUSPENDED" ? "Đã đình chỉ" : "Ngừng hoạt động"}
                        size="sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-[var(--gt-muted)] pt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Chủ: </span>
                        <IdText id={op.userId} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{op.getFormattedCreatedAt()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[var(--gt-border)]/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-[var(--gt-brand)] hover:bg-[var(--gt-brand-soft)] rounded-full gap-1 font-semibold"
                        onClick={() =>
                          setSelectedUserForModal({
                            userId: op.userId,
                            operatorName: op.name,
                          })
                        }
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chủ sở hữu</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={updatingOperatorId === op.id}
                        onClick={() => setOperatorToToggle(op)}
                        className={
                          op.status === "ACTIVE"
                            ? "h-8 rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-3.5 font-bold shadow-xs"
                            : "h-8 rounded-full border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 text-xs px-3.5 font-bold shadow-xs"
                        }
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        <span>{op.status === "ACTIVE" ? "Đình chỉ" : "Kích hoạt"}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 sm:p-5 border-t border-[var(--gt-border)]/60 bg-white/40">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  onPageChange={(newPage) => setPage(newPage)}
                />
              </div>
            )}
          </>
        )}
      </SurfaceCard>

      {/* Modal xem chi tiết người dùng sở hữu nhà xe */}
      <AdminUserDetailModal
        open={Boolean(selectedUserForModal)}
        userId={selectedUserForModal?.userId || null}
        operatorName={selectedUserForModal?.operatorName}
        roleBadge="Nhà xe"
        onClose={() => setSelectedUserForModal(null)}
      />

      {/* Confirm Toggle Status Dialog */}
      <ConfirmDialog
        open={Boolean(operatorToToggle)}
        onOpenChange={(open) => !open && setOperatorToToggle(null)}
        title={operatorToToggle?.status === "ACTIVE" ? "Đình chỉ nhà xe?" : "Kích hoạt lại nhà xe?"}
        description={
          operatorToToggle?.status === "ACTIVE"
            ? `Bạn có chắc chắn muốn đình chỉ hoạt động của nhà xe "${operatorToToggle?.name}"? Các tuyến chuyến đang bán sẽ bị tạm dừng.`
            : `Kích hoạt lại đối tác nhà xe "${operatorToToggle?.name}"? Các chuyến bị dừng trước đó vẫn cần nhà xe mở bán lại nếu còn đủ điều kiện.`
        }
        confirmLabel={operatorToToggle?.status === "ACTIVE" ? "Xác nhận đình chỉ" : "Kích hoạt"}
        variant={operatorToToggle?.status === "ACTIVE" ? "danger" : "primary"}
        onConfirm={handleConfirmToggle}
        loading={updatingOperatorId !== null}
      />
    </div>
  );
};
