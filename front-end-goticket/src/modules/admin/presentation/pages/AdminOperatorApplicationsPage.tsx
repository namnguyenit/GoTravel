import React, { useEffect, useState, useMemo } from "react";
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
  const [applications, setApplications] = useState<OperatorApplicationEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("PENDING");
  const [searchTerm, setSearchTerm] = useState<string>("");

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
    setLoading(true);
    setError(null);
    try {
      const data = await adminOperatorService.getOperatorApplications();
      setApplications(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách đơn đăng ký nhà xe."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchApplications();
  }, []);

  // Filtered and searched data
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        selectedStatus === "ALL" ? true : app.status === selectedStatus;

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        app.name.toLowerCase().includes(term) ||
        app.userId.toLowerCase().includes(term) ||
        app.phone.toLowerCase().includes(term) ||
        app.address.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [applications, selectedStatus, searchTerm]);

  // Status counts
  const counts = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.isPending()).length;
    const approved = applications.filter((a) => a.isApproved()).length;
    const rejected = applications.filter((a) => a.isRejected()).length;
    return { total, pending, approved, rejected };
  }, [applications]);

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!approvingApplication) return;
    setProcessing(true);
    try {
      await adminOperatorService.processOperatorApplication({
        applicationId: approvingApplication.id,
        status: "APPROVED",
      });
      setFeedback({
        type: "success",
        message: `Đã phê duyệt đơn đăng ký của nhà xe "${approvingApplication.name}" thành công! Bản ghi Nhà xe đã được kích hoạt.`,
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
      setProcessing(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async (reason: string) => {
    if (!rejectingApplication) return;
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
    } finally {
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
            className="rounded-full border-white/80 bg-white/80 backdrop-blur-md shadow-xs gap-2 px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Metric Cards & Status Filter Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setSelectedStatus("ALL")}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
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
          onClick={() => setSelectedStatus("PENDING")}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
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
          onClick={() => setSelectedStatus("APPROVED")}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
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
          onClick={() => setSelectedStatus("REJECTED")}
          className="text-left w-full focus:outline-none transition-transform hover:-translate-y-0.5"
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
          className={`flex items-center justify-between rounded-[24px] p-4 text-xs sm:text-sm border backdrop-blur-md shadow-xs ${
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
            className="h-7 text-xs rounded-full"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Search & Tabs Toolbar */}
      <SurfaceCard className="p-4 sm:p-5 rounded-[28px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/60 backdrop-blur-sm rounded-full border border-white/80 shadow-xs">
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
                onClick={() => setSelectedStatus(statusKey)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                  selectedStatus === statusKey
                    ? "bg-[#FF385C] text-white shadow-coral-sm"
                    : "text-[var(--gt-muted)] hover:text-[var(--gt-ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-3 left-3.5 h-4 w-4 text-[var(--gt-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên nhà xe, SĐT, User ID..."
              className="w-full h-10 pl-10 pr-8 text-xs bg-white/70 backdrop-blur-md border border-white/80 rounded-full focus:border-[var(--gt-coral)] focus:ring-4 focus:ring-[var(--gt-coral)]/10 focus:outline-none transition-all shadow-xs"
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
        </div>
      </SurfaceCard>

      {/* Main Content Area */}
      <SurfaceCard className="p-0 overflow-hidden rounded-[32px]">
        <div className="p-5 sm:p-6 border-b border-[var(--gt-border)]/60 flex items-center justify-between">
          <h2 className="font-black text-base text-[var(--gt-ink)]">
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
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--gt-border)]/60 bg-white/50 backdrop-blur-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider text-[11px]">
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
                      className="hover:bg-white/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-[var(--gt-coral-soft)]/80 text-[var(--gt-coral)] flex items-center justify-center shrink-0 shadow-xs">
                            <Building2 className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="font-bold text-[var(--gt-ink)] text-sm block">
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
                            className="h-6 w-6 p-0 rounded-full text-[var(--gt-coral)] hover:bg-[var(--gt-coral-soft)]"
                            onClick={() =>
                              setSelectedUserModal({
                                userId: app.userId,
                                operatorName: app.name,
                              })
                            }
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--gt-muted)]">
                        <div className="space-y-0.5 font-medium">
                          <div className="flex items-center gap-1.5 text-[var(--gt-ink)] font-bold">
                            <Phone className="w-3.5 h-3.5 text-[var(--gt-coral)]" />
                            <span>{app.phone}</span>
                          </div>
                          <span className="text-[11px] block max-w-xs truncate text-[var(--gt-muted)]">
                            {app.address}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--gt-muted)]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[var(--gt-muted)]/80" />
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
                            className="h-8 px-3 text-xs text-[var(--gt-coral)] hover:bg-[var(--gt-coral-soft)] rounded-full gap-1 font-semibold"
                            onClick={() => setDetailApplication(app)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem KYC</span>
                          </Button>

                          {app.canBeProcessed() && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-3 font-bold gap-1 shadow-xs"
                                onClick={() => setRejectingApplication(app)}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="h-8 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-coral-sm text-xs px-3.5 font-bold gap-1"
                                onClick={() => setApprovingApplication(app)}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
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
            <div className="block lg:hidden divide-y divide-white/60">
              {filteredApplications.map((app) => (
                <div key={app.id} className="p-4 sm:p-5 space-y-3 hover:bg-white/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-[var(--gt-coral-soft)]/80 text-[var(--gt-coral)] flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[var(--gt-ink)]">
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

                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--gt-muted)] pt-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-[var(--gt-coral)] shrink-0" />
                      <span className="truncate">{app.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{app.getFormattedCreatedAt()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[var(--gt-border)]/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-[var(--gt-coral)] hover:bg-[var(--gt-coral-soft)] rounded-full gap-1 font-semibold"
                      onClick={() => setDetailApplication(app)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </Button>

                    {app.canBeProcessed() && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-3 font-bold shadow-xs"
                          onClick={() => setRejectingApplication(app)}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Từ chối</span>
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-8 rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-coral-sm text-xs px-3.5 font-bold"
                          onClick={() => setApprovingApplication(app)}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
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
    </div>
  );
};
