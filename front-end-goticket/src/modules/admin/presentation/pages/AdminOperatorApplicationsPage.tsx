import React, { useEffect, useState, useRef } from "react";
import { adminOperatorService } from "../../composition";
import type { OperatorApplicationEntity } from "../../domain/entity/operator-application.entity";
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
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  Inbox,
  ShieldCheck,
  X,
} from "lucide-react";
import { AdminUserDetailModal } from "../components/AdminUserDetailModal";
import { AdminRejectApplicationModal } from "../components/AdminRejectApplicationModal";
import { AdminApplicationDetailModal } from "../components/AdminApplicationDetailModal";

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export const AdminOperatorApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<OperatorApplicationEntity[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [listPage, setListPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalElements: 0,
  });
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const request = useRef(0);
  const mutation = useRef(false);
  // Filters
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("PENDING");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchTerm.trim());
      setListPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Modals state
  const [selectedUserModal, setSelectedUserModal] = useState<{
    userId: string;
    operatorName: string;
  } | null>(null);

  const [detailApplication, setDetailApplication] =
    useState<OperatorApplicationEntity | null>(null);

  const [rejectingApplication, setRejectingApplication] =
    useState<OperatorApplicationEntity | null>(null);

  const [approvingApplication, setApprovingApplication] =
    useState<OperatorApplicationEntity | null>(null);

  const [processing, setProcessing] = useState<boolean>(false);

  const fetchApplications = async () => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const data = await adminOperatorService.getOperatorApplications(
        selectedStatus,
        listPage,
        keyword
      );
      if (current !== request.current) return;
      if (data.totalPages > 0 && listPage > data.totalPages) {
        setListPage(data.totalPages);
        return;
      }
      setApplications(data.data);
      setPagination(data);
      setCounts({
        total: data.counts.ALL,
        pending: data.counts.PENDING,
        approved: data.counts.APPROVED,
        rejected: data.counts.REJECTED,
      });
    } catch (err: unknown) {
      if (current === request.current)
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đơn đăng ký nhà xe."
        );
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchApplications();
    return () => {
      request.current++;
    };
  }, [selectedStatus, listPage, keyword]);

  // Filtered and searched data
  const filteredApplications = applications;

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (
      !approvingApplication ||
      !approvingApplication.isPending() ||
      mutation.current
    )
      return;
    mutation.current = true;
    setProcessing(true);
    try {
      await adminOperatorService.processOperatorApplication({
        applicationId: approvingApplication.id,
        status: "APPROVED",
      });
      setFeedback({
        type: "success",
        message: `Đã phê duyệt đơn đăng ký của nhà xe "${approvingApplication.name}" thành công! Hồ sơ đã được duyệt và đồng bộ sang dịch vụ nhà xe.`,
      });
      setApprovingApplication(null);
      await fetchApplications();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Đã có lỗi xảy ra khi phê duyệt đơn đăng ký.",
      });
    } finally {
      mutation.current = false;
      setProcessing(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async (reason: string) => {
    if (
      !rejectingApplication ||
      !rejectingApplication.isPending() ||
      mutation.current ||
      !reason.trim()
    )
      return;
    mutation.current = true;
    setProcessing(true);
    try {
      await adminOperatorService.processOperatorApplication({
        applicationId: rejectingApplication.id,
        status: "REJECTED",
        rejectReason: reason,
      });
      setFeedback({
        type: "success",
        message: `Đã từ chối đơn đăng ký của nhà xe "${rejectingApplication.name}".`,
      });
      setRejectingApplication(null);
      await fetchApplications();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Đã có lỗi xảy ra khi từ chối đơn đăng ký.",
      });
      throw err;
    } finally {
      mutation.current = false;
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title="Duyệt Đơn Đăng Ký Nhà Xe"
        eyebrow="Quy trình Thẩm định KYC Đối tác"
        description="Kiểm tra thông tin pháp nhân, hồ sơ KYC và phê duyệt hoặc từ chối các đối tác xin gia nhập hệ thống GoTicket."
        breadcrumbs={[
          { label: "Admin GoTicket", to: "/admin" },
          { label: "Duyệt hồ sơ nhà xe" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApplications}
            disabled={loading}
            className="gap-2 rounded-full border-white/80 bg-white/80 px-4 py-2 text-xs font-bold shadow-xs backdrop-blur-md"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Metric Cards & Status Filter Pills */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            if (processing) return;
            setSelectedStatus("ALL");
            setListPage(1);
            setSearchTerm("");
          }}
          className="w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
        >
          <MetricCard
            label="Tất cả hồ sơ"
            value={counts.total}
            subtext="Tổng số lượt đăng ký"
            icon={Inbox}
            variant={selectedStatus === "ALL" ? "coral" : "default"}
          />
        </button>

        <button
          type="button"
          onClick={() => {
            if (processing) return;
            setSelectedStatus("PENDING");
            setListPage(1);
            setSearchTerm("");
          }}
          className="w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
        >
          <MetricCard
            label="Chờ xét duyệt"
            value={counts.pending}
            subtext="Cần admin xử lý"
            icon={Clock}
            variant={selectedStatus === "PENDING" ? "coral" : "default"}
          />
        </button>

        <button
          type="button"
          onClick={() => {
            if (processing) return;
            setSelectedStatus("APPROVED");
            setListPage(1);
            setSearchTerm("");
          }}
          className="w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
        >
          <MetricCard
            label="Đã phê duyệt"
            value={counts.approved}
            subtext="Đã trở thành đối tác"
            icon={CheckCircle}
            variant={selectedStatus === "APPROVED" ? "emerald" : "default"}
          />
        </button>

        <button
          type="button"
          onClick={() => {
            if (processing) return;
            setSelectedStatus("REJECTED");
            setListPage(1);
            setSearchTerm("");
          }}
          className="w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
        >
          <MetricCard
            label="Đã từ chối"
            value={counts.rejected}
            subtext="Hồ sơ không đạt chuẩn"
            icon={XCircle}
            variant={selectedStatus === "REJECTED" ? "coral" : "default"}
          />
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-[24px] border p-4 text-xs shadow-xs backdrop-blur-md sm:text-sm ${
            feedback.type === "success"
              ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-800"
              : "border-rose-200/80 bg-rose-50/80 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 rounded-full text-xs"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Search & Tabs Toolbar */}
      <SurfaceCard className="rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/80 bg-white/60 p-1 shadow-xs backdrop-blur-sm">
            {(
              [
                ["ALL", `Tất cả (${counts.total})`],
                ["PENDING", `Chờ duyệt (${counts.pending})`],
                ["APPROVED", `Đã duyệt (${counts.approved})`],
                ["REJECTED", `Từ chối (${counts.rejected})`],
              ] as Array<[FilterStatus, string]>
            ).map(([statusKey, label]) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => {
                  if (processing) return;
                  setSelectedStatus(statusKey);
                  setListPage(1);
                  setSearchTerm("");
                }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedStatus === statusKey
                    ? "shadow-brand-sm bg-[var(--gt-brand)] text-white"
                    : "text-[var(--gt-muted)] hover:text-[var(--gt-ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-[var(--gt-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm hồ sơ theo tên nhà xe, SĐT, địa chỉ hoặc mã tài khoản…"
              className="h-10 w-full rounded-full border border-white/80 bg-white/70 pr-8 pl-10 text-xs shadow-xs backdrop-blur-md transition-all focus:border-[var(--gt-brand)] focus:ring-4 focus:ring-[var(--gt-brand)]/10 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute top-3 right-3 text-[var(--gt-muted)] hover:text-[var(--gt-ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Main Content Area */}
      <SurfaceCard className="overflow-hidden rounded-[32px] p-0">
        <div className="flex items-center justify-between border-b border-[var(--gt-border)]/60 p-5 sm:p-6">
          <h2 className="text-base font-black text-[var(--gt-ink)]">
            Danh sách đơn đăng ký ({filteredApplications.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-14">
            <LoadingState message="Đang tải danh sách hồ sơ..." />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-14">
            <EmptyState
              title="Không tìm thấy đơn nào"
              description={
                searchTerm
                  ? `Không có đơn đăng ký nào khớp với từ khóa "${searchTerm}".`
                  : `Không có đơn đăng ký nào ở trạng thái ${
                      selectedStatus === "PENDING"
                        ? "chờ duyệt"
                        : selectedStatus === "APPROVED"
                          ? "đã duyệt"
                          : selectedStatus === "REJECTED"
                            ? "đã từ chối"
                            : "này"
                    }.`
              }
              action={
                searchTerm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="rounded-full text-xs"
                  >
                    Xóa tìm kiếm
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--gt-border)]/60 bg-white/50 text-[11px] font-bold tracking-wider text-[var(--gt-muted)] uppercase backdrop-blur-xs">
                    <th className="px-5 py-4">Nhà xe</th>
                    <th className="px-5 py-4">Chủ sở hữu</th>
                    <th className="px-5 py-4">Liên hệ & Trụ sở</th>
                    <th className="px-5 py-4">Ngày gửi đơn</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="transition-colors hover:bg-white/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--gt-brand-soft)]/80 text-[var(--gt-brand)] shadow-xs">
                            <Building2 className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-[var(--gt-ink)]">
                              {app.name}
                            </span>
                            <IdText id={app.id} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <IdText id={app.userId} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 rounded-full p-0 text-[var(--gt-brand)] hover:bg-[var(--gt-brand-soft)]"
                            onClick={() =>
                              setSelectedUserModal({
                                userId: app.userId,
                                operatorName: app.name,
                              })
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--gt-muted)]">
                        <div className="space-y-0.5 font-medium">
                          <div className="flex items-center gap-1.5 font-bold text-[var(--gt-ink)]">
                            <Phone className="h-3.5 w-3.5 text-[var(--gt-brand)]" />
                            <span>{app.phone}</span>
                          </div>
                          <span className="block max-w-xs truncate text-[11px] text-[var(--gt-muted)]">
                            {app.address}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--gt-muted)]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-[var(--gt-muted)]/80" />
                          <span>{app.getFormattedCreatedAt()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={app.status}
                          label={
                            app.isApproved()
                              ? "APPROVED"
                              : app.isRejected()
                                ? "REJECTED"
                                : "PENDING"
                          }
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 rounded-full px-3 text-xs font-semibold text-[var(--gt-brand)] hover:bg-[var(--gt-brand-soft)]"
                            onClick={() => setDetailApplication(app)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem KYC</span>
                          </Button>

                          {app.canBeProcessed() && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 rounded-full border-rose-200/80 px-3 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-50"
                                onClick={() => setRejectingApplication(app)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Từ chối</span>
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="shadow-brand-sm h-8 gap-1 rounded-full bg-[var(--gt-brand)] px-3.5 text-xs font-bold text-white hover:bg-[var(--gt-brand-hover)]"
                                disabled={!app.logoUrl}
                                title={
                                  !app.logoUrl
                                    ? "Nhà xe cần bổ sung logo trước khi duyệt"
                                    : undefined
                                }
                                onClick={() => setApprovingApplication(app)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Duyệt</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="block divide-y divide-white/60 lg:hidden">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="space-y-3 p-4 transition-colors hover:bg-white/50 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--gt-brand-soft)]/80 text-[var(--gt-brand)] shadow-xs">
                        <Building2 className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--gt-ink)]">
                          {app.name}
                        </h3>
                        <IdText id={app.id} />
                      </div>
                    </div>
                    <StatusBadge
                      status={app.status}
                      label={
                        app.isApproved()
                          ? "APPROVED"
                          : app.isRejected()
                            ? "REJECTED"
                            : "PENDING"
                      }
                      size="sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[var(--gt-muted)]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--gt-brand)]" />
                      <span className="truncate">{app.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{app.getFormattedCreatedAt()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-[var(--gt-border)]/50 pt-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 rounded-full px-3 text-xs font-semibold text-[var(--gt-brand)] hover:bg-[var(--gt-brand-soft)]"
                      onClick={() => setDetailApplication(app)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Chi tiết</span>
                    </Button>

                    {app.canBeProcessed() && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-rose-200/80 px-3 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-50"
                          onClick={() => setRejectingApplication(app)}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          <span>Từ chối</span>
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="shadow-brand-sm h-8 rounded-full bg-[var(--gt-brand)] px-3.5 text-xs font-bold text-white hover:bg-[var(--gt-brand-hover)]"
                          disabled={!app.logoUrl}
                          title={
                            !app.logoUrl
                              ? "Nhà xe cần bổ sung logo trước khi duyệt"
                              : undefined
                          }
                          onClick={() => setApprovingApplication(app)}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          <span>Duyệt</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SurfaceCard>

      {/* Modal chi tiết Hồ sơ */}
      <AdminApplicationDetailModal
        open={Boolean(detailApplication)}
        application={detailApplication}
        onClose={() => setDetailApplication(null)}
        onApprove={(app) => setApprovingApplication(app)}
        onReject={(app) => setRejectingApplication(app)}
        onViewUser={(userId, operatorName) =>
          setSelectedUserModal({ userId, operatorName })
        }
      />

      {/* Modal từ chối hồ sơ kèm lý do */}
      <AdminRejectApplicationModal
        open={Boolean(rejectingApplication)}
        applicationName={rejectingApplication?.name}
        applicationId={rejectingApplication?.id}
        onClose={() => setRejectingApplication(null)}
        onConfirm={handleConfirmReject}
        loading={processing}
      />

      {/* Modal chi tiết User */}
      <AdminUserDetailModal
        open={Boolean(selectedUserModal)}
        userId={selectedUserModal?.userId || null}
        operatorName={selectedUserModal?.operatorName}
        roleBadge="Nhà xe ứng tuyển"
        onClose={() => setSelectedUserModal(null)}
      />

      {/* Confirm Approve Dialog */}
      <ConfirmDialog
        open={Boolean(approvingApplication)}
        onOpenChange={(open) => !open && setApprovingApplication(null)}
        title="Phê duyệt đơn đăng ký Nhà xe?"
        description={`Bạn có chắc chắn muốn phê duyệt đơn của nhà xe "${approvingApplication?.name}"? Hệ thống sẽ tạo đối tác nhà xe chính thức trên GoTicket và cấp quyền điều hành.`}
        confirmLabel="Xác nhận Phê duyệt"
        variant="primary"
        onConfirm={handleConfirmApprove}
        loading={processing}
      />
      {!error && (
        <Pagination
          currentPage={listPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalElements}
          onPageChange={setListPage}
          disabled={loading || processing}
        />
      )}
    </div>
  );
};
