import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Button,
  StatusBadge,
  IdText,
} from "@/shared/presentation/components";
import {
  Building2,
  Phone,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { OperatorApplicationEntity } from "../../domain/entity/operator-application.entity";

interface AdminApplicationDetailModalProps {
  application: OperatorApplicationEntity | null;
  open: boolean;
  onClose: () => void;
  onApprove: (app: OperatorApplicationEntity) => void;
  onReject: (app: OperatorApplicationEntity) => void;
  onViewUser: (userId: string, operatorName: string) => void;
}

export const AdminApplicationDetailModal: React.FC<
  AdminApplicationDetailModalProps
> = ({ application, open, onClose, onApprove, onReject, onViewUser }) => {
  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:rounded-2xl border-line">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-coral">
            <Building2 className="h-3.5 w-3.5" />
            <span>Chi tiết Hồ sơ Đăng ký Nhà xe</span>
          </div>
          <DialogTitle className="text-xl font-serif font-bold text-ink">
            {application.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Đơn xin gia nhập mạng lưới đối tác vận tải GoTicket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Status banner */}
          <div className="flex items-center justify-between rounded-2xl border border-line bg-canvas p-3.5">
            <div className="flex items-center space-x-2 font-semibold text-ink">
              {application.isApproved() ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : application.isRejected() ? (
                <XCircle className="h-4 w-4 text-rose-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600" />
              )}
              <span>
                {application.isApproved()
                  ? "Đã phê duyệt"
                  : application.isRejected()
                    ? "Đã từ chối"
                    : "Đang chờ xét duyệt"}
              </span>
            </div>
            <StatusBadge
              status={application.status}
              label={
                application.isApproved()
                  ? "APPROVED"
                  : application.isRejected()
                    ? "REJECTED"
                    : "PENDING"
              }
              size="sm"
            />
          </div>

          {/* If rejected, show reject reason */}
          {application.rejectReason && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-rose-800">
              <div className="flex items-center space-x-1.5 font-bold text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>Lý do từ chối:</span>
              </div>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                {application.rejectReason}
              </p>
            </div>
          )}

          {/* Section 1: Thông tin Pháp nhân */}
          <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
            <h4 className="font-semibold text-ink text-xs uppercase tracking-wider text-muted flex items-center gap-1.5 pb-1 border-b border-line/60">
              <Building2 className="w-3.5 h-3.5 text-coral" />
              <span>Thông tin Pháp nhân & Trụ sở</span>
            </h4>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-muted">Tên thương hiệu</span>
              <span className="font-bold text-ink">{application.name}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-muted">Mã số thuế</span>
              <span className="font-mono text-ink">
                {application.taxCode || "Chưa cung cấp"}
              </span>
            </div>

            <div className="flex items-start justify-between py-1">
              <span className="font-medium text-muted">Địa chỉ trụ sở</span>
              <span className="max-w-[280px] text-right font-medium text-ink">
                {application.address}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-muted">Hotline / Số điện thoại</span>
              <a
                href={`tel:${application.phone}`}
                className="font-semibold text-coral hover:underline"
              >
                {application.phone}
              </a>
            </div>
          </div>

          {/* Section 2: Người đại diện & Tài khoản chủ sở hữu */}
          <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
            <h4 className="font-semibold text-ink text-xs uppercase tracking-wider text-muted flex items-center gap-1.5 pb-1 border-b border-line/60">
              <User className="w-3.5 h-3.5 text-coral" />
              <span>Người đại diện & Tài khoản liên kết</span>
            </h4>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-muted">Người đại diện pháp luật</span>
              <span className="font-semibold text-ink">
                {application.representativeName || "Chưa cung cấp"}
              </span>
            </div>

            {application.representativeIdNumber && (
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-muted">Số CCCD / Hộ chiếu</span>
                <span className="font-mono text-ink">
                  {application.representativeIdNumber}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-muted">Tài khoản User ID</span>
              <div className="flex items-center gap-2">
                <IdText id={application.userId} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewUser(application.userId, application.name)}
                  className="h-6 px-2 text-[11px] text-coral hover:bg-coral-soft"
                >
                  Xem User
                </Button>
              </div>
            </div>
          </div>

          {/* Section 3: Giấy tờ xác minh (CCCD / Giấy phép) */}
          <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
            <h4 className="font-semibold text-ink text-xs uppercase tracking-wider text-muted flex items-center gap-1.5 pb-1 border-b border-line/60">
              <FileText className="w-3.5 h-3.5 text-coral" />
              <span>Giấy tờ xác minh KYC</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {([
                ["Mặt trước", application.documentFrontUrl],
                ["Mặt sau", application.documentBackUrl],
              ] as Array<[string, string | undefined]>).map(([label, url]) =>
                url ? (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-xl overflow-hidden border border-line hover:border-coral transition-colors"
                  >
                    <img
                      src={url}
                      alt={`${label} giấy tờ người đại diện`}
                      className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="bg-canvas p-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-coral group-hover:text-coral-dark">
                      <span>{label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </a>
                ) : (
                  <div
                    key={label}
                    className="flex h-28 items-center justify-center rounded-xl border border-dashed border-line bg-canvas text-[11px] text-muted"
                  >
                    Thiếu ảnh {label.toLowerCase()}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Section 4: Lịch sử & Thời gian */}
          <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center font-medium text-muted">
                <Calendar className="mr-2 h-3.5 w-3.5 text-muted/80" />
                Ngày gửi đơn
              </span>
              <span className="text-ink">{application.getFormattedCreatedAt()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center font-medium text-muted">
                <Clock className="mr-2 h-3.5 w-3.5 text-muted/80" />
                Cập nhật lần cuối
              </span>
              <span className="text-ink">{application.getFormattedUpdatedAt()}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>

          {application.canBeProcessed() && (
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  onClose();
                  onReject(application);
                }}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                <span>Từ chối</span>
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  onClose();
                  onApprove(application);
                }}
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                <span>Phê duyệt</span>
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
