import React, { useState, useEffect, useMemo } from "react";
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
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface CreateTripModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (trip: TripEntity) => void;
}

interface ScheduleWarning {
  type: "OVERLAP" | "GEOGRAPHIC_FEASIBILITY";
  message: string;
  details?: string;
  existingTripSummary?: string;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  // Options state
  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [cars, setCars] = useState<CarEntity[]>([]);
  const [existingTrips, setExistingTrips] = useState<TripEntity[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  // Form fields state
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [departureTime, setDepartureTime] = useState<string>("");
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [pricePerSeat, setPricePerSeat] = useState<number>(200000);

  // Form submission & warning state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Soft Warning Modal State
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [detectedWarnings, setDetectedWarnings] = useState<ScheduleWarning[]>([]);

  // Load available active routes, cars and existing trips when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchActiveOptions = async () => {
      setLoadingOptions(true);
      setError(null);
      setConflictWarning(null);
      setShowWarningModal(false);
      setDetectedWarnings([]);

      try {
        const [routesRes, carsRes, tripsRes] = await Promise.all([
          routeService.getRoutes({ limit: 100, status: "ACTIVE" }),
          carService.getCars({ limit: 100 }),
          tripService.getTrips({ limit: 100 }).catch(() => ({ data: [] })),
        ]);

        // Filter only ACTIVE routes and cars
        const activeRoutes = routesRes.data.filter((r) => r.isActive());
        const activeCars = carsRes.data.filter((c) => c.status === "ACTIVE");

        setRoutes(activeRoutes);
        setCars(activeCars);
        setExistingTrips(tripsRes.data || []);

        if (!activeRoutes.some((route) => route.id === selectedRouteId)) {
          setSelectedRouteId(activeRoutes[0]?.id || '');
        }
        if (!activeCars.some((car) => car.id === selectedCarId)) {
          setSelectedCarId(activeCars[0]?.id || '');
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

  // Selected entities for display & verification
  const currentCar = useMemo(
    () => cars.find((c) => c.id === selectedCarId),
    [cars, selectedCarId]
  );
  const currentRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId),
    [routes, selectedRouteId]
  );

  /**
   * Phân tích xung đột & tính bất khả thi về mặt địa lý / lịch trình xe
   */
  const analyzeScheduleAnomalies = (): ScheduleWarning[] => {
    if (!selectedCarId || !departureTime || !arrivalTime) return [];

    const newDep = new Date(departureTime).getTime();
    const newArr = new Date(arrivalTime).getTime();
    if (isNaN(newDep) || isNaN(newArr) || newArr <= newDep) return [];

    const newOrigin = currentRoute?.origin?.trim() || "";
    const newDest = currentRoute?.destination?.trim() || "";
    const carName = currentCar ? `${currentCar.name} (${currentCar.licensePlate})` : "Xe đã chọn";

    // Lọc các chuyến khác của cùng chiếc xe này (không bao gồm chuyến CANCELLED)
    const otherTripsOfThisCar = existingTrips.filter(
      (t) => t.carId === selectedCarId && t.status !== "CANCELLED"
    );

    const warnings: ScheduleWarning[] = [];

    for (const t of otherTripsOfThisCar) {
      const tDep = new Date(t.departureTime).getTime();
      const tArr = new Date(t.arrivalTime).getTime();
      const tRoute = routes.find((r) => r.id === t.routeId);
      const tOrigin = tRoute?.origin?.trim() || "";
      const tDest = tRoute?.destination?.trim() || "";

      const tripSummaryText = `Chuyến [${tRoute ? tRoute.getSummaryRoute() : t.routeId}] (${new Date(
        t.departureTime
      ).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${new Date(
        t.departureTime
      ).toLocaleDateString("vi-VN")} - ${new Date(t.arrivalTime).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })} ${new Date(t.arrivalTime).toLocaleDateString("vi-VN")})`;

      // 1. Trùng lặp giờ trực tiếp (Overlapping time)
      if (newDep < tArr && newArr > tDep) {
        warnings.push({
          type: "OVERLAP",
          message: `Xung đột trùng lặp giờ chạy: Xe ${carName} đã có lịch chạy trong khung giờ này!`,
          details: `Khung giờ của chuyến mới (${new Date(newDep).toLocaleTimeString(
            "vi-VN"
          )} - ${new Date(newArr).toLocaleTimeString(
            "vi-VN"
          )}) chồng lấn với chuyến đang có của xe.`,
          existingTripSummary: tripSummaryText,
        });
        continue;
      }

      // 2. Kiểm tra tính khả thi địa lý: Chuyến cũ kết thúc trước chuyến mới
      if (tArr <= newDep) {
        const gapHours = (newDep - tArr) / (1000 * 60 * 60);

        // Nếu điểm đến chuyến trước khác điểm xuất phát chuyến mới
        if (tDest && newOrigin && tDest.toLowerCase() !== newOrigin.toLowerCase()) {
          // Nếu khoảng cách thời gian nghỉ < 3.5 tiếng đối với 2 tỉnh khác nhau
          if (gapHours < 3.5) {
            warnings.push({
              type: "GEOGRAPHIC_FEASIBILITY",
              message: `Khoảng cách địa lý không kịp di chuyển: Xe vừa trả khách ở ${tDest}, nhưng chuyến mới lại xuất phát ở ${newOrigin}!`,
              details: `Chuyến trước kết thúc lúc ${new Date(tArr).toLocaleTimeString(
                "vi-VN"
              )} ngày ${new Date(tArr).toLocaleDateString(
                "vi-VN"
              )} tại ${tDest}. Chuyến mới lại xuất bến lúc ${new Date(newDep).toLocaleTimeString(
                "vi-VN"
              )} tại ${newOrigin} (thời gian nghỉ chỉ ${gapHours.toFixed(
                1
              )} giờ, xe không thể di chuyển kịp giữa 2 tỉnh).`,
              existingTripSummary: tripSummaryText,
            });
          }
        }
      }

      // 3. Kiểm tra tính khả thi địa lý: Chuyến mới kết thúc trước chuyến tiếp theo của xe
      if (newArr <= tDep) {
        const gapHours = (tDep - newArr) / (1000 * 60 * 60);

        // Nếu điểm đến chuyến mới khác điểm xuất phát chuyến tiếp theo
        if (newDest && tOrigin && newDest.toLowerCase() !== tOrigin.toLowerCase()) {
          if (gapHours < 3.5) {
            warnings.push({
              type: "GEOGRAPHIC_FEASIBILITY",
              message: `Không đủ thời gian tiếp nối chuyến sau: Chuyến này kết thúc ở ${newDest}, nhưng chuyến tiếp theo lại đón khách ở ${tOrigin}!`,
              details: `Chuyến mới kết thúc lúc ${new Date(newArr).toLocaleTimeString(
                "vi-VN"
              )} tại ${newDest}. Chuyến tiếp theo của xe này lại xuất phát lúc ${new Date(
                tDep
              ).toLocaleTimeString("vi-VN")} tại ${tOrigin} (chỉ cách ${gapHours.toFixed(
                1
              )} giờ, xe khó đến kịp bến xuất phát mới).`,
              existingTripSummary: tripSummaryText,
            });
          }
        }
      }
    }

    return warnings;
  };

  // Cảnh báo sớm trên form
  const activeWarnings = useMemo(
    () => analyzeScheduleAnomalies(),
    [selectedCarId, selectedRouteId, departureTime, arrivalTime, existingTrips]
  );

  /**
   * Thực hiện tạo chuyến xe (gửi API lên server)
   */
  const executeCreateTrip = async () => {
    if (submitting) return;
    setShowWarningModal(false);
    setSubmitting(true);
    setError(null);
    setConflictWarning(null);

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
        setConflictWarning(
          `${msg} (Gợi ý: Kiểm tra lại biển số xe được chọn hoặc điều chỉnh khung giờ xuất bến để tránh chồng chéo).`
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflictWarning(null);

    // Validate route & car
    if (!selectedRouteId || !routes.some((route) => route.id === selectedRouteId)) {
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

    // Kiểm tra cảnh báo bất thường lịch trình xe
    const warnings = analyzeScheduleAnomalies();
    if (warnings.length > 0) {
      // Mở modal cảnh báo màu đỏ - Không chặn tuyệt đối, để nhà xe quyết định
      setDetectedWarnings(warnings);
      setShowWarningModal(true);
      return;
    }

    // Nếu không có cảnh báo nào, thực hiện tạo chuyến bình thường
    await executeCreateTrip();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => !val && !submitting && onClose()}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px] rounded-3xl border border-gray-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Lên lịch chuyến xe mới
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Gán tuyến đường, phương tiện và thiết lập khung giờ xuất bến
                  cho chuyến xe.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Schedule Conflict Error Alert từ Server (409) */}
          {conflictWarning && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <strong className="block font-bold text-rose-950">
                    Phản hồi từ hệ thống quản lý vận hành
                  </strong>
                  <p className="mt-1 leading-relaxed text-rose-800">
                    {conflictWarning}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Error Alert */}
          {error && (
            <div className="flex items-center space-x-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Warning Banner nếu phát hiện bất thường ngay trên form */}
          {activeWarnings.length > 0 && !conflictWarning && (
            <div className="rounded-2xl border-2 border-rose-400/80 bg-rose-50/90 p-3.5 text-xs text-rose-950 shadow-sm animate-pulse-subtle">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <span>Phát hiện {activeWarnings.length} điểm bất thường về lịch trình xe!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    {activeWarnings[0].message}
                  </p>
                  <p className="text-[10px] text-rose-600 italic">
                    * Khi nhấn "Lên lịch chuyến xe", hệ thống sẽ hiển thị bảng xác nhận để bạn quyết định có tiếp tục hay không.
                  </p>
                </div>
              </div>
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
            <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
              {/* 1. Route & Car Selection */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Route Select */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="routeId"
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    <span>Tuyến đường</span> <span className="text-rose-500">*</span>
                  </Label>
                  {routes.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                      Chưa có tuyến đường nào. Vui lòng tạo tuyến trước.
                    </div>
                  ) : (
                    <select
                      id="routeId"
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none shadow-2xs"
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
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    <CarIcon className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Xe khách phục vụ</span>{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  {cars.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                      Chưa có xe khách nào sẵn sàng. Vui lòng thêm xe trước.
                    </div>
                  ) : (
                    <select
                      id="carId"
                      value={selectedCarId}
                      onChange={(e) => setSelectedCarId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none shadow-2xs"
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
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-gray-700 uppercase">
                    Khung giờ vận hành
                  </span>
                  {durationText && (
                    <span className="rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-bold text-blue-700 shadow-2xs">
                      Thời lượng: {durationText}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="departureTime"
                      className="text-xs font-semibold text-gray-700"
                    >
                      Thời gian xuất bến <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="departureTime"
                      type="datetime-local"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="bg-white text-xs rounded-xl shadow-2xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="arrivalTime"
                      className="text-xs font-semibold text-gray-700"
                    >
                      Thời gian đến dự kiến{" "}
                      <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="arrivalTime"
                      type="datetime-local"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="bg-white text-xs rounded-xl shadow-2xs"
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
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Giá vé cơ bản trên mỗi ghế (VNĐ)</span>{" "}
                    <span className="text-rose-500">*</span>
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
                  className="text-xs rounded-xl shadow-2xs bg-white"
                  required
                />
                <span className="block text-[11px] text-gray-400">
                  Giá vé tối thiểu là 10.000 VNĐ.
                </span>
              </div>

              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3 text-[11px] text-blue-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Quy trình vận hành:</strong> Chuyến xe mới tạo sẽ ở trạng thái <strong>Bản nháp (DRAFT)</strong>. Sau khi tạo, hãy bấm nút <strong>"Cấu hình & Mở bán vé"</strong> để chính thức kích hoạt chuyến cho hành khách tìm kiếm và đặt vé.
                </span>
              </div>

              <DialogFooter className="gap-2 pt-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-full"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting || routes.length === 0 || cars.length === 0
                  }
                  className="rounded-full bg-[var(--gt-brand)] font-bold text-white hover:bg-[var(--gt-brand-hover)] shadow-md shadow-brand-sm"
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

      {/* MODAL CẢNH BÁO BẤT THƯỜNG / XUNG ĐỘT LỊCH XE (VIỀN ĐỎ - KHÔNG CHẶN TUYỆT ĐỐI) */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-lg p-6 rounded-3xl border-2 border-rose-500 bg-white shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 shadow-2xs">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-rose-950 uppercase tracking-tight">
                  Cảnh báo xung đột lịch trình xe
                </DialogTitle>
                <span className="text-[11px] font-semibold text-rose-600 block">
                  Phát hiện {detectedWarnings.length} điểm bất thường cần lưu ý
                </span>
              </div>
            </div>
            <DialogDescription className="text-xs text-gray-600 leading-relaxed pt-1">
              Hệ thống phát hiện thông tin xe hoặc thời gian chạy có thể bị trùng
              lặp hoặc không khả thi về mặt khoảng cách địa lý.
            </DialogDescription>
          </DialogHeader>

          {/* Chi tiết các cảnh báo */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 py-1">
            {detectedWarnings.map((warn, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-950 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-1 flex-1">
                    <strong className="block text-xs font-bold text-rose-900 leading-tight">
                      {warn.message}
                    </strong>
                    {warn.details && (
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        {warn.details}
                      </p>
                    )}
                    {warn.existingTripSummary && (
                      <div className="mt-1 rounded-xl bg-white/90 p-2 border border-rose-200 text-[11px] text-gray-700">
                        <span className="font-semibold text-rose-700 block text-[10px] uppercase">
                          Chuyến đã có trên hệ thống:
                        </span>
                        {warn.existingTripSummary}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Khuyến cáo & Lựa chọn của nhà xe */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Lưu ý nghiệp vụ:</strong> Đây là cảnh báo để tránh trường
              hợp nhập nhầm xe hoặc nhầm biển số giữa các xe cùng hãng. Quyết định
              cuối cùng thuộc về nhà xe. Bạn có thể chọn quay lại sửa hoặc vẫn
              tiếp tục tạo chuyến nếu có phương án xe dự phòng.
            </span>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWarningModal(false)}
              className="rounded-full border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold"
            >
              Quay lại chỉnh sửa xe/giờ
            </Button>
            <Button
              type="button"
              onClick={executeCreateTrip}
              disabled={submitting}
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tôi hiểu rủi ro, vẫn tiếp tục tạo chuyến"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
