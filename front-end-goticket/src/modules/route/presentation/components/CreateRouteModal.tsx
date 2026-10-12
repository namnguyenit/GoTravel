import React, { useState } from "react";
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
import { RouteLocationVO } from "../../domain/value-object/route-location.vo";
import { RouteStopVO } from "../../domain/value-object/route-stop.vo";
import type { RouteEntity } from "../../domain/entity/route.entity";
import { routeService } from "../../composition";
import {
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Navigation,
  Flag,
} from "lucide-react";

interface CreateRouteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (route: RouteEntity) => void;
}

interface StopFormItem {
  id: string; // unique key for react rendering
  name: string;
}

export const CreateRouteModal: React.FC<CreateRouteModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  // Default initial stops: 1 start and 1 destination stop
  const [stops, setStops] = useState<StopFormItem[]>([
    { id: "stop-init-0", name: "" },
    { id: "stop-init-1", name: "" },
  ]);

  const [touched, setTouched] = useState<{
    origin?: boolean;
    destination?: boolean;
    stops?: boolean;
  }>({});

  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setOrigin("");
    setDestination("");
    setStops([
      { id: `stop-${Date.now()}-0`, name: "" },
      { id: `stop-${Date.now()}-1`, name: "" },
    ]);
    setTouched({});
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  // Add intermediate stop before the final destination
  const handleAddStop = () => {
    setStops((prev) => {
      const copy = [...prev];
      // Insert right before the last element (destination station)
      copy.splice(copy.length - 1, 0, {
        id: `stop-${Date.now()}-${Math.random()}`,
        name: "",
      });
      return copy;
    });
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length <= 2) {
      setApiError("Tuyến đường bắt buộc phải có tối thiểu 2 trạm dừng.");
      return;
    }
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setStops((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= stops.length - 1) return;
    setStops((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleStopNameChange = (index: number, val: string) => {
    setStops((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: val };
      return copy;
    });
  };

  // Validation
  const locationErrors = RouteLocationVO.validate(origin, destination);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ origin: true, destination: true, stops: true });
    setApiError(null);
    setSuccessMessage(null);

    // Validate location
    if (
      locationErrors.originError ||
      locationErrors.destinationError ||
      locationErrors.matchError
    ) {
      setApiError(
        locationErrors.matchError ||
          locationErrors.originError ||
          locationErrors.destinationError
      );
      return;
    }

    // Validate stops
    const mappedStops = stops.map((s, idx) => ({
      name: s.name.trim(),
      order: idx,
    }));

    const stopsValidation = RouteStopVO.validateStopsList(mappedStops);
    if (!stopsValidation.isValid) {
      setApiError(stopsValidation.error || "Danh sách điểm dừng không hợp lệ.");
      return;
    }

    setLoading(true);

    try {
      const createdRoute = await routeService.createRoute({
        origin: origin.trim(),
        destination: destination.trim(),
        stops: mappedStops,
      });

      setSuccessMessage("Tạo tuyến đường thành công!");

      setTimeout(() => {
        resetForm();
        onSuccess(createdRoute);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể tạo tuyến đường mới.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto p-6 sm:rounded-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600">
            <MapPin className="h-4 w-4" />
            <span>Kênh Quản Lý Tuyến Đường</span>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Tạo tuyến đường mới
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Thiết lập điểm khởi hành, điểm đến và lộ trình các trạm đón/trả
            khách dọc đường.
          </DialogDescription>
        </DialogHeader>

        {/* Global Error Banner */}
        {apiError && (
          <div className="flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="flex items-center space-x-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Section 1: Origin & Destination */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Origin */}
            <div className="space-y-1">
              <Label
                htmlFor="route-origin"
                className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700"
              >
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  Điểm khởi hành <span className="text-red-500">*</span>
                </span>
              </Label>
              <Input
                id="route-origin"
                type="text"
                placeholder="Ví dụ: Hồ Chí Minh"
                value={origin}
                disabled={loading}
                onChange={(e) => setOrigin(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, origin: true }))}
                className={`text-sm ${
                  touched.origin && locationErrors.originError
                    ? "border-red-400 focus-visible:ring-red-400"
                    : ""
                }`}
              />
              {touched.origin && locationErrors.originError && (
                <p className="text-[11px] font-medium text-red-600">
                  {locationErrors.originError}
                </p>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-1">
              <Label
                htmlFor="route-destination"
                className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700"
              >
                <Flag className="h-3.5 w-3.5 text-red-600" />
                <span>
                  Điểm đến <span className="text-red-500">*</span>
                </span>
              </Label>
              <Input
                id="route-destination"
                type="text"
                placeholder="Ví dụ: Đà Lạt"
                value={destination}
                disabled={loading}
                onChange={(e) => setDestination(e.target.value)}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, destination: true }))
                }
                className={`text-sm ${
                  (touched.destination && locationErrors.destinationError) ||
                  locationErrors.matchError
                    ? "border-red-400 focus-visible:ring-red-400"
                    : ""
                }`}
              />
              {touched.destination && locationErrors.destinationError && (
                <p className="text-[11px] font-medium text-red-600">
                  {locationErrors.destinationError}
                </p>
              )}
              {locationErrors.matchError && (
                <p className="text-[11px] font-medium text-red-600">
                  {locationErrors.matchError}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Route Stops Builder */}
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase">
                  Lộ trình trạm đón / trả khách ({stops.length} trạm)
                </h4>
                <p className="text-[11px] text-gray-500">
                  Tối thiểu 2 trạm dừng (1 điểm đón đầu tuyến & 1 điểm trả cuối
                  tuyến).
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStop}
                disabled={loading}
                className="h-7 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                <span>Thêm điểm dừng</span>
              </Button>
            </div>

            {/* List of stops */}
            <div className="space-y-2 pt-1">
              {stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === stops.length - 1;

                return (
                  <div
                    key={stop.id}
                    className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white p-2.5 shadow-2xs"
                  >
                    {/* Badge order */}
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isFirst
                          ? "bg-blue-100 text-blue-800"
                          : isLast
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {index}
                    </div>

                    {/* Stop name input */}
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder={
                          isFirst
                            ? "Ví dụ: Bến xe Miền Đông Mới (Bắt đầu)"
                            : isLast
                              ? "Ví dụ: Bến xe liên tỉnh Đà Lạt (Kết thúc)"
                              : `Ví dụ: Trạm dừng chân ${index}`
                        }
                        value={stop.name}
                        disabled={loading}
                        onChange={(e) =>
                          handleStopNameChange(index, e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Order adjustment buttons */}
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0 || loading}
                        onClick={() => handleMoveUp(index)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900"
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === stops.length - 1 || loading}
                        onClick={() => handleMoveDown(index)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Delete stop button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={stops.length <= 2 || loading}
                      onClick={() => handleRemoveStop(index)}
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                      title="Xóa trạm này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2 sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span>Lưu tuyến đường</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
