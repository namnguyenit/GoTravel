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
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface ConfirmDeleteRouteModalProps {
  open: boolean;
  route: RouteEntity | null;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteRouteModal: React.FC<ConfirmDeleteRouteModalProps> = ({
  open,
  route,
  isSubmitting = false,
  error,
  onClose,
  onConfirm,
}) => {
  if (!route) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md rounded-[28px] p-6 border border-gray-100 shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Xác nhận xóa tuyến đường
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 leading-relaxed">
            Bạn có chắc chắn muốn xóa tuyến đường{" "}
            <strong className="text-gray-900 font-bold">{route.getSummaryRoute()}</strong>?
            Tuyến sẽ biến mất khỏi danh sách và không thể chọn để tạo chuyến mới.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Mã tuyến:</span>
            <span className="font-mono font-semibold text-gray-800">{route.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Số lượng trạm:</span>
            <span className="font-semibold text-gray-800">{route.getTotalStops()} trạm dừng</span>
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <p className="text-xs text-gray-500">Các chuyến xe, vé và điểm đón/trả đã có vẫn được giữ nguyên. Chuyến đang mở bán tiếp tục theo lịch; chuyến nháp trên tuyến đã xóa không thể mở bán.</p>
        <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-full text-xs font-semibold"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                <span>Xóa tuyến đường</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
