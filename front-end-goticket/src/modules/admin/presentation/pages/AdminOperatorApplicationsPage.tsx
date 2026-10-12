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
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Metric Cards & Status Filter Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setSelectedStatus("ALL")}
          className="text-left w-full focus:outline-none"
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
          className="text-left w-full focus:outline-none"
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
          className="text-left w-full focus:outline-none"
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
          className="text-left w-full focus:outline-none"
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
          className={`flex items-center justify-between rounded-2xl p-4 text-xs sm:text-sm border ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 text-xs"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Search & Tabs Toolbar */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-canvas rounded-xl border border-line">
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedStatus === statusKey
                    ? "bg-coral text-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên nhà xe, SĐT, User ID..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-canvas border border-line rounded-xl focus:border-coral focus:ring-1 focus:ring-coral focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-muted hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Main Content Area */}
      <SurfaceCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-bold text-base text-ink">
            Danh sách đơn đăng ký ({filteredApplications.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12">
            <LoadingState message="Đang tải danh sách hồ sơ..." />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12">
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
                <thead className="border-b border-line bg-canvas/70 font-semibold text-muted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Nhà xe</th>
                    <th className="px-5 py-3.5">Chủ sở hữu</th>
                    <th className="px-5 py-3.5">Liên hệ & Trụ sở</th>
                    <th className="px-5 py-3.5">Ngày gửi đơn</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-coral-soft/20 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-coral-soft text-coral flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-ink text-sm block">
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
                            className="h-6 px-1.5 text-xs text-coral hover:bg-coral-soft"
                            onClick={() =>
                              setSelectedUserModal({
                                userId: app.userId,
                                operatorName: app.name,
                              })
                            }
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-ink font-medium">
                            <Phone className="w-3.5 h-3.5 text-coral" />
                            <span>{app.phone}</span>
                          </div>
                          <span className="text-[11px] block max-w-xs truncate">
                            {app.address}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted/80" />
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
                            className="h-8 px-2 text-xs text-coral hover:bg-coral-soft gap-1"
                            onClick={() => setDetailApplication(app)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem</span>
                          </Button>

                          {app.canBeProcessed() && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs gap-1"
                                onClick={() => setRejectingApplication(app)}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="h-8 text-xs gap-1"
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
            <div className="block lg:hidden divide-y divide-line/60">
              {filteredApplications.map((app) => (
                <div key={app.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-coral-soft text-coral flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-ink">
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

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-coral shrink-0" />
                      <span className="truncate">{app.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{app.getFormattedCreatedAt()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/40">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-coral hover:bg-coral-soft gap-1"
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
                          className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
                          onClick={() => setRejectingApplication(app)}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Từ chối</span>
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
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
