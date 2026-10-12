import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RouteEntity } from "../../domain/entity/route.entity";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";

interface ConfirmToggleRouteModalProps {
  open: boolean;
  route: RouteEntity | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmToggleRouteModal: React.FC<
  ConfirmToggleRouteModalProps
> = ({ open, route, isSubmitting = false, onClose, onConfirm }) => {
  if (!route) return null;

  const isLocking = route.isActive();

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !isSubmitting && onClose()}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center rounded-full p-2.5 ${
                isLocking
                  ? "bg-amber-100 text-amber-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {isLocking ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Unlock className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {isLocking
                  ? "Xác nhận tạm khóa tuyến đường"
                  : "Xác nhận mở khóa tuyến đường"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-gray-500">
                {route.getSummaryRoute()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          {isLocking ? (
            <div className="space-y-2.5 rounded-lg border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="leading-relaxed">
                  Bạn có chắc chắn muốn tạm khóa tuyến đường{" "}
                  <strong className="font-semibold text-amber-950">
                    {route.origin} ➔ {route.destination}
                  </strong>
                  ? Tuyến đường này sẽ không thể dùng để tạo thêm chuyến đi mới
                  cho đến khi được mở khóa trở lại.
                </p>
              </div>
              <div className="border-t border-amber-200/60 pt-2 pl-7 text-xs text-amber-700/90">
                <strong>Lưu ý:</strong> Các chuyến xe đã lên lịch trước đó vẫn
                sẽ tiếp tục hoạt động bình thường cho đến khi hoàn thành.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-4 text-sm text-emerald-900">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="leading-relaxed">
                  Kích hoạt lại tuyến đường{" "}
                  <strong className="font-semibold text-emerald-950">
                    {route.origin} ➔ {route.destination}
                  </strong>{" "}
                  để tiếp tục lên lịch chuyến xe? Tuyến sẽ hiển thị lại cho hành
                  khách tìm kiếm.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={
              isLocking
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : isLocking ? (
              "Đồng ý khóa"
            ) : (
              "Kích hoạt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
