import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/shared/presentation/components";
import { XCircle, AlertCircle } from "lucide-react";

interface AdminRejectApplicationModalProps {
  open: boolean;
  applicationName?: string;
  applicationId?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export const AdminRejectApplicationModal: React.FC<
  AdminRejectApplicationModalProps
> = ({
  open,
  applicationName,
  applicationId: _applicationId,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do từ chối đơn đăng ký.");
      return;
    }

    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi từ chối đơn."
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && !loading && onClose()}
    >
      <DialogContent className="max-w-md p-6 sm:rounded-2xl border-line">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <XCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-serif font-bold text-ink">
            Từ chối đơn đăng ký Nhà xe
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Bạn đang từ chối đơn đăng ký của nhà xe{" "}
            <strong className="text-ink">
              {applicationName || "đã chọn"}
            </strong>
            . Vui lòng cung cấp lý do để gửi phản hồi cho đối tác.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="reject-reason"
              className="text-xs font-semibold text-ink"
            >
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              placeholder="Nhập lý do cụ thể (Ví dụ: Số điện thoại không liên lạc được, thông tin pháp nhân không hợp lệ...)"
              className="w-full rounded-xl border border-line bg-canvas p-3 text-xs text-ink placeholder:text-muted focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-colors"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Xác nhận Từ chối"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
