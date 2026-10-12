import React, { useEffect, useState } from "react";
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
import type { TripEntity } from "../../domain/entity/trip.entity";
import type { RouteEntity } from "@/modules/route/domain/entity/route.entity";
import { RouteStopTimeline } from "@/modules/route/presentation/components/RouteStopTimeline";
import { routeService } from "@/modules/route/composition";
import {
  Waypoints,
  MapPin,
  Clock,
  Bus,
  Calendar,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TripRouteDetailModalProps {
  trip: TripEntity | null;
  open: boolean;
  onClose: () => void;
}

export const TripRouteDetailModal: React.FC<TripRouteDetailModalProps> = ({
  trip,
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const [route, setRoute] = useState<RouteEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !trip?.routeId) {
      setRoute(null);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchRouteDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const found = await routeService.getRouteById(trip.routeId);
        if (isMounted) {
          if (found) {
            setRoute(found);
          } else {
            setError(
              "Không tìm thấy thông tin chi tiết các trạm dừng của tuyến đường này."
            );
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin tuyến đường."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRouteDetail();

    return () => {
      isMounted = false;
    };
  }, [open, trip?.routeId]);

  if (!trip) return null;

  const origin = route?.origin || trip.route?.origin || "Điểm xuất phát";
  const destination =
    route?.destination || trip.route?.destination || "Điểm đến";
  const totalStops = route ? route.getTotalStops() : 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Waypoints className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900 sm:text-xl">
                  Chi tiết tuyến: {origin}
                  <ArrowRight className="mx-1.5 inline-block h-4 w-4 text-gray-400" />
                  {destination}
                </DialogTitle>
                {route && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${route.getStatusBadgeClasses()}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        route.isActive()
                          ? "animate-pulse bg-emerald-500"
                          : "bg-zinc-400"
                      }`}
                    />
                    {route.getStatusDisplayName()}
                  </span>
                )}
              </div>
              <DialogDescription className="mt-0.5 font-mono text-xs text-gray-400">
                Mã tuyến: {trip.routeId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Route Highlights Card */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-2">
            <div className="flex items-start space-x-2.5">
              <div className="mt-0.5 rounded-md bg-blue-100 p-1.5 text-blue-700">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-gray-500 uppercase">
                  Bến khởi hành
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {origin}
                </span>
                {route?.getStartStop() && (
                  <span className="block text-xs text-blue-600">
                    Trạm: {route.getStartStop()?.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <div className="mt-0.5 rounded-md bg-red-100 p-1.5 text-red-700">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-gray-500 uppercase">
                  Bến kết thúc
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {destination}
                </span>
                {route?.getEndStop() && (
                  <span className="block text-xs text-red-600">
                    Trạm: {route.getEndStop()?.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Associated Trip Context */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 text-xs text-gray-600">
            <span className="mb-2 flex items-center gap-1.5 font-bold text-gray-700 uppercase">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Chuyến xe đang phục vụ lộ trình này
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">
                  Lịch trình
                </span>
                <span className="font-semibold text-gray-800">
                  {trip.getFormattedDepartureTime()}
                </span>
                <span className="block text-gray-500">
                  Thời lượng: {trip.getDurationText()}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">
                  Xe phục vụ
                </span>
                <div className="flex items-center gap-1 font-semibold text-gray-800">
                  <Bus className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="truncate">{trip.car?.name || "N/A"}</span>
                </div>
                <span className="block font-mono text-gray-500">
                  {trip.car?.licensePlate || ""}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">
                  Giá vé & Trạng thái
                </span>
                <span className="block font-bold text-blue-600">
                  {trip.getFormattedPrice()} / ghế
                </span>
                <span className="block text-gray-500">
                  {trip.getStatusDisplayName()}
                </span>
              </div>
            </div>
          </div>

          {/* Stops / Waypoints Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Lộ trình chi tiết các trạm dừng
                </h4>
                {route && (
                  <Badge
                    variant="outline"
                    className="border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-700"
                  >
                    {totalStops} trạm dừng
                  </Badge>
                )}
              </div>

              {route?.getFormattedCreatedAt() && (
                <span className="flex items-center text-[11px] text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" />
                  Ngày tạo: {route.getFormattedCreatedAt()}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Loader2 className="mb-2 h-7 w-7 animate-spin text-blue-600" />
                <p className="text-xs font-medium">
                  Đang tải danh sách trạm dừng của tuyến đường...
                </p>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{error}</span>
              </div>
            ) : route && route.stops.length > 0 ? (
              <RouteStopTimeline stops={route.stops} />
            ) : (
              <p className="py-4 text-center text-xs text-gray-400 italic">
                Chưa có danh sách trạm dừng chi tiết cho tuyến đường này.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate("/operator/routes");
            }}
            className="text-xs font-medium text-gray-700"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
            Đến trang quản lý tuyến đường
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="w-full text-xs sm:w-auto"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
