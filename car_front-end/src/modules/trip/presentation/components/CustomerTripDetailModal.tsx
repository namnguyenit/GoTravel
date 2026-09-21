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
import { Badge } from "@/components/ui/badge";
import type { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import { RouteStopTimeline } from "@/modules/route/presentation/components/RouteStopTimeline";
import {
  Clock,
  Bus,
  MapPin,
  Building2,
  Users,
  ShieldCheck,
  Check,
} from "lucide-react";

interface CustomerTripDetailModalProps {
  trip: CustomerTripEntity | null;
  open: boolean;
  onClose: () => void;
  onSelectTrip?: (trip: CustomerTripEntity) => void;
}

export const CustomerTripDetailModal: React.FC<
  CustomerTripDetailModalProps
> = ({ trip, open, onClose, onSelectTrip }) => {
  if (!trip) return null;

  const stops = trip.getStopsAsEntities();

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900 sm:text-xl">
                  {trip.getSummaryRoute()}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${trip.getCarTypeBadgeClasses()}`}
                >
                  {trip.getCarTypeLabel()}
                </Badge>
              </div>
              <DialogDescription className="mt-0.5 text-xs text-gray-500">
                Nhà xe:{" "}
                <strong className="text-gray-700">{trip.operator.name}</strong>{" "}
                • Ngày khởi hành: {trip.getDepartureDateOnly()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Schedule Banner */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-blue-100/80 pb-2">
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-blue-900 uppercase">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Lịch trình vận hành
              </span>
              <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                Thời lượng: {trip.getDurationText()}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-100/60 bg-white p-3">
                <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                  Giờ xuất bến
                </span>
                <span className="mt-0.5 block text-base font-bold text-gray-900">
                  {trip.getDepartureTimeOnly()}
                </span>
                <span className="mt-1 flex items-center gap-1 text-gray-500">
                  <MapPin className="h-3 w-3 text-blue-600" />
                  {trip.getStartStopName()}
                </span>
              </div>

              <div className="rounded-lg border border-blue-100/60 bg-white p-3">
                <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                  Giờ đến dự kiến
                </span>
                <span className="mt-0.5 block text-base font-bold text-gray-900">
                  {trip.getArrivalTimeOnly()}
                </span>
                <span className="mt-1 flex items-center gap-1 text-gray-500">
                  <MapPin className="h-3 w-3 text-red-500" />
                  {trip.getEndStopName()}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle & Operator Highlights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
              <span className="flex items-center gap-1.5 font-bold text-gray-700 uppercase">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                Đơn vị vận chuyển
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nhà xe:</span>
                  <span className="font-semibold text-gray-800">
                    {trip.operator.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cam kết:</span>
                  <span className="flex items-center gap-1 font-medium text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Đã xác thực
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
              <span className="flex items-center gap-1.5 font-bold text-gray-700 uppercase">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                Tình trạng chỗ ngồi
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Loại xe:</span>
                  <span className="font-semibold text-gray-800">
                    {trip.car.name} ({trip.getCarTypeLabel()})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chỗ trống:</span>
                  <span
                    className={`font-bold ${
                      trip.isSoldOut() ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {trip.getAvailableSeatsText()} / {trip.seats.totalSeats} ghế
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Stops Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold tracking-wider text-gray-700 uppercase">
                Lộ trình trạm đón & trả khách ({stops.length} trạm)
              </h4>
              <span className="text-[11px] text-gray-400">
                Đón/trả theo thứ tự
              </span>
            </div>

            <RouteStopTimeline stops={stops} />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Giá vé niêm yết:</span>
            <span className="text-lg font-black text-blue-600">
              {trip.getFormattedPrice()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs"
            >
              Đóng
            </Button>
            {onSelectTrip && !trip.isSoldOut() && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectTrip(trip);
                }}
                className="bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                <span>Chọn chuyến này</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
