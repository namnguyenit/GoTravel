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
import type { TripEntity } from "../../domain/entity/trip.entity";
import {
  type TripStatus,
  TRIP_STATUS,
} from "../../domain/value-object/trip-status.vo";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Bus,
  MapPin,
} from "lucide-react";

interface ConfirmUpdateTripStatusModalProps {
  trip: TripEntity | null;
  targetStatus: TripStatus | null;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmUpdateTripStatusModal: React.FC<
  ConfirmUpdateTripStatusModalProps
> = ({ trip, targetStatus, open, loading = false, onClose, onConfirm }) => {
  if (!trip || !targetStatus) return null;

  const isDeparting = targetStatus === TRIP_STATUS.DEPARTED;
  const isCompleting = targetStatus === TRIP_STATUS.COMPLETED;
  const isCancelling = targetStatus === TRIP_STATUS.CANCELLED;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !loading && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {isDeparting && (
              <div className="rounded-full bg-amber-100 p-2.5 text-amber-700">
                <Play className="h-5 w-5 fill-amber-700" />
              </div>
            )}
            {isCompleting && (
              <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            {isCancelling && (
              <div className="rounded-full bg-rose-100 p-2.5 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {isDeparting && "Xác nhận xuất bến chuyến xe"}
                {isCompleting && "Xác nhận hoàn tất hành trình"}
                {isCancelling && "Cảnh báo: Xác nhận hủy chuyến xe"}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-gray-400">
                Mã chuyến: {trip.id}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-3 text-sm text-gray-600">
          {/* Trip Summary Overview */}
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 font-semibold text-gray-800">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                {trip.getSummaryRoute()}
              </span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">
                {trip.getDurationText()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5 text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  Xuất bến: <strong>{trip.getFormattedDepartureTime()}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Bus className="h-3.5 w-3.5 text-gray-400" />
                <span className="truncate">
                  {trip.car?.name || "Xe"} ({trip.car?.licensePlate})
                </span>
              </div>
            </div>
          </div>

          {/* Contextual Warning / Info */}
          {isDeparting && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="mb-1 font-semibold">Quy định xuất bến:</p>
              <p>
                Sau khi xuất bến, chuyến xe sẽ chuyển sang trạng thái{" "}
                <strong>Đang chạy (DEPARTED)</strong>. Khi đó, hệ thống sẽ{" "}
                <strong>chặn hoàn toàn việc hủy chuyến</strong> vì xe đang lăn
                bánh trên đường.
              </p>
            </div>
          )}

          {isCompleting && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p className="mb-1 font-semibold">Xác nhận hoàn thành:</p>
              <p>
                Chuyến xe sẽ chuyển sang trạng thái{" "}
                <strong>Hoàn thành (COMPLETED)</strong> và kết thúc phiên vận
                hành. Trạng thái này là kết thúc và không thể đảo ngược.
              </p>
            </div>
          )}

          {isCancelling && (
            <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <p className="flex items-center gap-1 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                Lưu ý quan trọng khi hủy chuyến:
              </p>
              <p>
                Toàn bộ vé đã đặt (`BOOKED`/`PAID`) của hành khách thuộc chuyến
                xe này sẽ tự động chuyển sang trạng thái{" "}
                <strong>Đã hủy (CANCELLED)</strong>.
              </p>
              <p className="font-medium text-rose-900">
                Hành động này là vĩnh viễn và không thể mở lại chuyến sau khi đã
                hủy!
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onClose}
            className="text-xs"
          >
            Đóng
          </Button>

          {isDeparting && (
            <Button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700"
            >
              {loading && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Xác nhận xuất bến</span>
            </Button>
          )}

          {isCompleting && (
            <Button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {loading && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Xác nhận hoàn thành</span>
            </Button>
          )}

          {isCancelling && (
            <Button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
            >
              {loading && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Đồng ý hủy chuyến</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
