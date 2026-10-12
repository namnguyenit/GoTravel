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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-[32px] border-2 border-white/80 bg-white/95 backdrop-blur-2xl shadow-glass-xl text-[var(--gt-ink)]">
        <DialogHeader className="space-y-1.5 text-left border-b border-[var(--gt-border)]/60 pb-4">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--gt-coral)] uppercase tracking-wider">
            <Building2 className="h-4 w-4" />
            <span>Hồ sơ Thẩm định KYC Nhà xe</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-[var(--gt-ink)] tracking-tight">
            {application.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--gt-muted)]">
            Đơn xin gia nhập mạng lưới đối tác vận tải GoTicket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Status banner */}
          <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-4 shadow-xs">
            <div className="flex items-center space-x-2.5 font-bold text-[var(--gt-ink)]">
              {application.isApproved() ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                </div>
              ) : application.isRejected() ? (
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <XCircle className="h-4.5 w-4.5 text-rose-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-4.5 w-4.5 text-amber-600" />
                </div>
              )}
              <div>
                <span className="block text-sm">
                  {application.isApproved()
                    ? "Đã phê duyệt đối tác"
                    : application.isRejected()
                      ? "Đã từ chối tiếp nhận"
                      : "Đang chờ xét duyệt"}
                </span>
                <span className="text-[11px] font-normal text-[var(--gt-muted)]">
                  Mã hồ sơ: #{application.id}
                </span>
              </div>
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
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 backdrop-blur-md p-4 text-rose-800 shadow-xs">
              <div className="flex items-center space-x-2 font-bold text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Lý do từ chối hồ sơ:</span>
              </div>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed font-medium pl-6">
                {application.rejectReason}
              </p>
            </div>
          )}

          {/* Section 1: Thông tin Pháp nhân */}
          <div className="space-y-3 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm p-4.5 shadow-xs">
            <h4 className="font-bold text-[var(--gt-ink)] text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[var(--gt-border)]/50">
              <Building2 className="w-4 h-4 text-[var(--gt-coral)]" />
              <span>Thông tin Pháp nhân & Trụ sở</span>
            </h4>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-[var(--gt-muted)]">Tên thương hiệu</span>
              <span className="font-bold text-[var(--gt-ink)]">{application.name}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-[var(--gt-muted)]">Mã số thuế</span>
              <span className="font-mono font-bold text-[var(--gt-ink)] bg-stone-100/80 px-2 py-0.5 rounded-md">
                {application.taxCode || "Chưa cung cấp"}
              </span>
            </div>

            <div className="flex items-start justify-between py-1">
              <span className="font-medium text-[var(--gt-muted)]">Địa chỉ trụ sở</span>
              <span className="max-w-[320px] text-right font-medium text-[var(--gt-ink)]">
                {application.address}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-[var(--gt-muted)]">Hotline / Số điện thoại</span>
              <a
                href={`tel:${application.phone}`}
                className="font-bold text-[var(--gt-coral)] hover:underline flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{application.phone}</span>
              </a>
            </div>
          </div>

          {/* Section 2: Người đại diện & Tài khoản chủ sở hữu */}
          <div className="space-y-3 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm p-4.5 shadow-xs">
            <h4 className="font-bold text-[var(--gt-ink)] text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[var(--gt-border)]/50">
              <User className="w-4 h-4 text-[var(--gt-coral)]" />
              <span>Người đại diện & Tài khoản liên kết</span>
            </h4>

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-[var(--gt-muted)]">Người đại diện pháp luật</span>
              <span className="font-bold text-[var(--gt-ink)]">
                {application.representativeName || "Chưa cung cấp"}
              </span>
            </div>

            {application.representativeIdNumber && (
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-[var(--gt-muted)]">Số CCCD / Hộ chiếu</span>
                <span className="font-mono font-bold text-[var(--gt-ink)] bg-stone-100/80 px-2 py-0.5 rounded-md">
                  {application.representativeIdNumber}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-[var(--gt-muted)]">Tài khoản User ID</span>
              <div className="flex items-center gap-2">
                <IdText id={application.userId} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewUser(application.userId, application.name)}
                  className="h-6 px-2.5 text-[11px] text-[var(--gt-coral)] hover:bg-[var(--gt-coral-soft)] rounded-full font-bold"
                >
                  Xem hồ sơ User
                </Button>
              </div>
            </div>
          </div>

          {/* Section 3: Giấy tờ xác minh (CCCD / Giấy phép) */}
          <div className="space-y-3 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm p-4.5 shadow-xs">
            <h4 className="font-bold text-[var(--gt-ink)] text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[var(--gt-border)]/50">
              <FileText className="w-4 h-4 text-[var(--gt-coral)]" />
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
                    className="group block rounded-2xl overflow-hidden border border-white/80 hover:border-[var(--gt-coral)] shadow-xs transition-all"
                  >
                    <img
                      src={url}
                      alt={`${label} giấy tờ người đại diện`}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="bg-white/80 backdrop-blur-xs p-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-[var(--gt-coral)] group-hover:text-[var(--gt-coral-hover)] border-t border-white/80">
                      <span>{label}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ) : (
                  <div
                    key={label}
                    className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 text-[11px] text-[var(--gt-muted)] font-medium"
                  >
                    Thiếu ảnh {label.toLowerCase()}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Section 4: Lịch sử & Thời gian */}
          <div className="space-y-2 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center font-medium text-[var(--gt-muted)]">
                <Calendar className="mr-2 h-3.5 w-3.5 text-[var(--gt-muted)]/80" />
                Ngày gửi đơn
              </span>
              <span className="text-[var(--gt-ink)] font-semibold">{application.getFormattedCreatedAt()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center font-medium text-[var(--gt-muted)]">
                <Clock className="mr-2 h-3.5 w-3.5 text-[var(--gt-muted)]/80" />
                Cập nhật lần cuối
              </span>
              <span className="text-[var(--gt-ink)] font-semibold">{application.getFormattedUpdatedAt()}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-3 border-t border-[var(--gt-border)]/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-full px-5 text-xs font-semibold">
            Đóng
          </Button>

          {application.canBeProcessed() && (
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-50 text-xs px-4 py-2 font-bold shadow-xs"
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
                className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-coral-sm text-xs px-5 py-2 font-bold"
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
