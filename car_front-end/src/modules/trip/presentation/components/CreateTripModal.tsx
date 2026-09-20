import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { routeService } from "@/modules/route/composition";
import { carService } from "@/modules/car/composition";
import { tripService } from "../../composition";
import type { RouteEntity } from "@/modules/route/domain/entity/route.entity";
import type { CarEntity } from "@/modules/car/domain/entity/car.entity";
import type { TripEntity } from "../../domain/entity/trip.entity";
import { TripTimeVO } from "../../domain/value-object/trip-time.vo";
import { TripPriceVO } from "../../domain/value-object/trip-price.vo";
import {
  CalendarClock,
  Car as CarIcon,
  MapPin,
  AlertCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  Info,
} from "lucide-react";

interface CreateTripModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (trip: TripEntity) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  // Options state
  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [cars, setCars] = useState<CarEntity[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  // Form fields state
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [departureTime, setDepartureTime] = useState<string>("");
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [pricePerSeat, setPricePerSeat] = useState<number>(200000);

  // Form submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Load available active routes and cars when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchActiveOptions = async () => {
      setLoadingOptions(true);
      setError(null);
      setConflictWarning(null);

      try {
        const [routesRes, carsRes] = await Promise.all([
          routeService.getRoutes({ limit: 100, status: "ACTIVE" }),
          carService.getCars({ limit: 100 }),
        ]);

        // Filter only ACTIVE routes and cars
        const activeRoutes = routesRes.data.filter((r) => r.isActive());
        const activeCars = carsRes.data.filter((c) => c.status === "ACTIVE");

        setRoutes(activeRoutes);
        setCars(activeCars);

        if (activeRoutes.length > 0 && !selectedRouteId) {
          setSelectedRouteId(activeRoutes[0].id);
        }
        if (activeCars.length > 0 && !selectedCarId) {
          setSelectedCarId(activeCars[0].id);
        }

        // Initialize default dates: departure in 3 hours, arrival in 8 hours
        if (!departureTime) {
          const dep = new Date();
          dep.setHours(dep.getHours() + 3, 0, 0, 0);
          const depStr = new Date(
            dep.getTime() - dep.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);
          setDepartureTime(depStr);

          const arr = new Date(dep);
          arr.setHours(arr.getHours() + 5, 30, 0, 0);
          const arrStr = new Date(
            arr.getTime() - arr.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);
          setArrivalTime(arrStr);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách tuyến đường hoặc xe khách."
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchActiveOptions();
  }, [open]);

  // Compute duration dynamically
  const durationText =
    departureTime && arrivalTime
      ? TripTimeVO.formatDuration(departureTime, arrivalTime)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflictWarning(null);

    // Validate route & car
    if (!selectedRouteId) {
      setError("Vui lòng chọn một tuyến đường đang hoạt động.");
      return;
    }
    if (!selectedCarId) {
      setError("Vui lòng chọn một xe khách đang hoạt động.");
      return;
    }

    // Validate times
    const timeVal = TripTimeVO.validate(departureTime, arrivalTime);
    if (!timeVal.isValid) {
      setError(
        timeVal.departureError ||
          timeVal.arrivalError ||
          "Thời gian chạy không hợp lệ."
      );
      return;
    }

    // Validate price
    const priceVal = TripPriceVO.validate(Number(pricePerSeat));
    if (!priceVal.isValid) {
      setError(priceVal.error || "Giá vé không hợp lệ.");
      return;
    }

    setSubmitting(true);
    try {
      const createdTrip = await tripService.createTrip({
        routeId: selectedRouteId,
        carId: selectedCarId,
        departureTime: new Date(departureTime).toISOString(),
        arrivalTime: new Date(arrivalTime).toISOString(),
        pricePerSeat: Number(pricePerSeat),
      });

      onSuccess(createdTrip);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lên lịch chuyến xe thất bại.";
      if (msg.includes("trùng lịch") || msg.includes("lịch vận hành")) {
        setConflictWarning(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !submitting && onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Lên lịch chuyến xe mới
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Gán tuyến đường, phương tiện và thiết lập khung giờ xuất bến cho
                chuyến xe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Schedule Conflict Warning Alert */}
        {conflictWarning && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <strong className="block font-semibold text-rose-950">
                  Cảnh báo trùng lịch chạy xe (409 Conflict)
                </strong>
                <p className="mt-1 leading-relaxed">{conflictWarning}</p>
              </div>
            </div>
          </div>
        )}

        {/* General Error Alert */}
        {error && (
          <div className="flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loadingOptions ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-10 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs">
              Đang tải danh sách tuyến và xe sẵn sàng...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* 1. Route & Car Selection */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Route Select */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="routeId"
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"
                >
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  Tuyến đường <span className="text-red-500">*</span>
                </Label>
                {routes.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    Chưa có tuyến đường nào đang hoạt động. Vui lòng tạo tuyến
                    trước.
                  </div>
                ) : (
                  <select
                    id="routeId"
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.getSummaryRoute()} ({route.getTotalStops()} trạm)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Car Select */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="carId"
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"
                >
                  <CarIcon className="h-3.5 w-3.5 text-indigo-600" />
                  Xe khách phục vụ <span className="text-red-500">*</span>
                </Label>
                {cars.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    Chưa có xe khách nào sẵn sàng hoạt động. Vui lòng thêm xe
                    trước.
                  </div>
                ) : (
                  <select
                    id="carId"
                    value={selectedCarId}
                    onChange={(e) => setSelectedCarId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.name} ({car.licensePlate} - {car.totalSeats} chỗ)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2. Schedule Times */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Khung giờ vận hành
                </span>
                {durationText && (
                  <span className="rounded bg-blue-100/70 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Thời lượng: {durationText}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="departureTime"
                    className="text-xs font-medium text-gray-600"
                  >
                    Thời gian xuất bến <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="departureTime"
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="bg-white text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="arrivalTime"
                    className="text-xs font-medium text-gray-600"
                  >
                    Thời gian đến dự kiến{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="arrivalTime"
                    type="datetime-local"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="bg-white text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Info className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  Thời gian đến phải sau thời gian đi tối thiểu 15 phút.
                </span>
              </div>
            </div>

            {/* 3. Ticket Pricing */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="pricePerSeat"
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"
                >
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  Giá vé cơ bản trên mỗi ghế (VNĐ){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <span className="text-xs font-bold text-emerald-700">
                  {TripPriceVO.formatVND(Number(pricePerSeat))}
                </span>
              </div>
              <Input
                id="pricePerSeat"
                type="number"
                step="5000"
                min="10000"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(Number(e.target.value))}
                placeholder="250000"
                className="text-xs"
                required
              />
              <span className="block text-[11px] text-gray-400">
                Giá vé tối thiểu là 10.000 VNĐ.
              </span>
            </div>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting || routes.length === 0 || cars.length === 0
                }
                className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lên lịch...
                  </>
                ) : (
                  "Lên lịch chuyến xe"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
