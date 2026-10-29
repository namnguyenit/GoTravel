import { OperatorLogo } from "@/shared/presentation/components/operator/OperatorLogo";
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
import type { CustomerTripEntity } from "../../domain/entity/customer-trip.entity";
import { RouteStopTimeline } from "@/modules/route/presentation/components/RouteStopTimeline";
import { MoneyText } from "@/shared/presentation/components/data-display/MoneyText";
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
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:max-w-[640px] sm:p-7">
        <DialogHeader>
          <div className="flex items-start space-x-3.5">
            <div className="mt-0.5 shrink-0 rounded-2xl bg-[var(--gt-brand-soft)] p-3 text-[var(--gt-brand)]">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900 sm:text-xl">
                  {trip.getSummaryRoute()}
                </DialogTitle>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">
                  {trip.getCarTypeLabel()}
                </span>
              </div>
              <DialogDescription className="mt-1 text-xs text-gray-500">
                Nhà xe:{" "}
                <strong className="font-bold text-gray-800">
                  {trip.operator.name}
                </strong>{" "}
                • Ngày khởi hành:{" "}
                <span className="font-semibold tabular-nums">
                  {trip.getDepartureDateOnly()}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Schedule Banner */}
          <div className="space-y-3 rounded-2xl border border-gray-200/80 bg-[#FAF9F6] p-4">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-gray-700 uppercase">
                <Clock className="h-3.5 w-3.5 text-[var(--gt-brand)]" />
                Lịch trình vận hành
              </span>
              <span className="rounded-full border border-gray-200/60 bg-white px-3 py-0.5 text-xs font-bold text-[var(--gt-brand)] tabular-nums">
                Thời lượng: {trip.getDurationText()}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200/80 bg-white p-3.5">
                <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Giờ xuất bến
                </span>
                <span className="mt-0.5 block text-xl font-black text-[#111827] tabular-nums">
                  {trip.getDepartureTimeOnly()}
                </span>
                <span className="mt-1 flex items-center gap-1 truncate font-semibold text-gray-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--gt-brand)]" />
                  {trip.getStartStopName()}
                </span>
              </div>

              <div className="rounded-xl border border-gray-200/80 bg-white p-3.5">
                <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Giờ đến dự kiến
                </span>
                <span className="mt-0.5 block text-xl font-black text-[#111827] tabular-nums">
                  {trip.getArrivalTimeOnly()}
                </span>
                <span className="mt-1 flex items-center gap-1 truncate font-semibold text-gray-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {trip.getEndStopName()}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle & Operator Highlights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-gray-200/80 bg-white p-4">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-800 uppercase">
                <Building2 className="h-3.5 w-3.5 text-[var(--gt-brand)]" />
                Đơn vị vận chuyển
              </span>
              <OperatorLogo
                src={trip.operator.logoUrl}
                name={trip.operator.name}
                className="h-16 w-16"
              />
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nhà xe:</span>
                  <span className="font-bold text-gray-900">
                    {trip.operator.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kiểm định KYC:</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Đã
                    kiểm duyệt
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-gray-200/80 bg-white p-4">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-800 uppercase">
                <Users className="h-3.5 w-3.5 text-[var(--gt-brand)]" />
                Tình trạng chỗ ngồi
              </span>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Loại xe:</span>
                  <span className="font-bold text-gray-900">
                    {trip.car.name} ({trip.getCarTypeLabel()})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chỗ trống:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      trip.isSoldOut() ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {trip.getAvailableSeatsText()} / {trip.seats.totalSeats} ghế
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Stops Timeline */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5">
            <div className="mb-3.5 flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h4 className="text-[11px] font-bold tracking-wider text-gray-800 uppercase">
                Lộ trình trạm đón & trả khách ({stops.length} trạm)
              </h4>
              <span className="text-[11px] text-gray-400">
                Đón/trả theo thứ tự
              </span>
            </div>

            <RouteStopTimeline stops={stops} />
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="text-xs text-gray-400">Giá vé:</span>
            <MoneyText amount={trip.pricePerSeat} size="xl" variant="coral" />
          </div>

          <div className="flex items-center space-x-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 rounded-full border-gray-200 px-5 text-xs font-semibold"
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
                className="shadow-brand-sm h-10 rounded-full bg-[var(--gt-brand)] px-6 text-xs font-bold text-white transition-all hover:bg-[var(--gt-brand-hover)]"
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
