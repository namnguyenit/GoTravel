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
import {
  type CarType,
  CAR_TYPE_OPTIONS,
} from "../../domain/value-object/car-type.vo";
import { LicensePlateVO } from "../../domain/value-object/license-plate.vo";
import type { CarEntity } from "../../domain/entity/car.entity";
import { carService } from "../../composition";
import {
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Car,
  Loader2,
} from "lucide-react";

interface AddCarModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (car: CarEntity) => void;
}

export const AddCarModal: React.FC<AddCarModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<CarType>("SLEEPER");
  const [licensePlate, setLicensePlate] = useState<string>("");
  const [totalSeats, setTotalSeats] = useState<number | "">(40);

  const [touched, setTouched] = useState<{
    name?: boolean;
    licensePlate?: boolean;
    totalSeats?: boolean;
  }>({});

  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setType("SLEEPER");
    setLicensePlate("");
    setTotalSeats(40);
    setTouched({});
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  // Client validations
  const getNameError = (): string | null => {
    if (!touched.name) return null;
    if (!name || !name.trim()) return "Tên xe không được để trống.";
    if (name.trim().length < 3) return "Tên xe phải có ít nhất 3 ký tự.";
    if (name.trim().length > 100)
      return "Tên xe không được vượt quá 100 ký tự.";
    return null;
  };

  const getLicensePlateError = (): string | null => {
    if (!touched.licensePlate) return null;
    return LicensePlateVO.getValidationError(licensePlate);
  };

  const getTotalSeatsError = (): string | null => {
    if (!touched.totalSeats) return null;
    if (totalSeats === "" || totalSeats <= 0) {
      return "Tổng số ghế phải là số nguyên lớn hơn 0.";
    }
    return null;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase for license plate input
    setLicensePlate(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, licensePlate: true, totalSeats: true });
    setApiError(null);
    setSuccessMessage(null);

    // Final checks
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      setApiError("Vui lòng nhập tên xe hợp lệ (từ 3 đến 100 ký tự).");
      return;
    }

    const plateErr = LicensePlateVO.getValidationError(licensePlate);
    if (plateErr) {
      setApiError(plateErr);
      return;
    }

    if (totalSeats === "" || Number(totalSeats) <= 0) {
      setApiError("Tổng số ghế phải là số nguyên lớn hơn 0.");
      return;
    }

    setLoading(true);

    try {
      const newCar = await carService.addCar({
        name: name.trim(),
        type,
        licensePlate: LicensePlateVO.normalize(licensePlate),
        totalSeats: Number(totalSeats),
      });

      setSuccessMessage("Thêm xe mới thành công!");

      // Allow visual confirmation before closing
      setTimeout(() => {
        resetForm();
        onSuccess(newCar);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Thêm xe mới không thành công.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const nameError = getNameError();
  const plateError = getLicensePlateError();
  const seatsError = getTotalSeatsError();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md p-6 sm:rounded-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600">
            <Car className="h-4 w-4" />
            <span>Kênh Quản Lý Nhà Xe</span>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Thêm xe mới
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Đăng ký phương tiện xe khách mới vào danh sách quản lý của nhà xe.
          </DialogDescription>
        </DialogHeader>

        {/* Global Error Banner */}
        {apiError && (
          <div className="flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="flex items-center space-x-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* 1. Tên xe */}
          <div className="space-y-1">
            <Label
              htmlFor="car-name"
              className="text-xs font-semibold text-gray-700"
            >
              Tên xe <span className="text-red-500">*</span>
            </Label>
            <Input
              id="car-name"
              type="text"
              placeholder="Ví dụ: Xe Limousine VIP 01"
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              className={`text-sm ${
                nameError || (apiError && !name)
                  ? "border-red-400 focus-visible:ring-red-400"
                  : ""
              }`}
            />
            {nameError && (
              <p className="text-[11px] font-medium text-red-600">
                {nameError}
              </p>
            )}
            <p className="text-[11px] text-gray-400">
              Độ dài từ 3 đến 100 ký tự.
            </p>
          </div>

          {/* 2. Biển số xe */}
          <div className="space-y-1">
            <Label
              htmlFor="car-license-plate"
              className="text-xs font-semibold text-gray-700"
            >
              Biển số xe <span className="text-red-500">*</span>
            </Label>
            <Input
              id="car-license-plate"
              type="text"
              placeholder="Ví dụ: 51B-123.45 hoặc 29B-987.65"
              value={licensePlate}
              disabled={loading}
              onChange={handlePlateChange}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, licensePlate: true }))
              }
              className={`font-mono text-sm uppercase ${
                plateError || (apiError && apiError.includes("Biển số xe"))
                  ? "border-red-400 focus-visible:ring-red-400"
                  : ""
              }`}
            />
            {plateError && (
              <p className="text-[11px] font-medium text-red-600">
                {plateError}
              </p>
            )}
            <p className="text-[11px] text-gray-400">
              Theo định dạng biển số xe Việt Nam, là duy nhất trên toàn hệ
              thống.
            </p>
          </div>

          {/* 3. Loại xe & 4. Tổng số ghế */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="car-type"
                className="text-xs font-semibold text-gray-700"
              >
                Loại xe <span className="text-red-500">*</span>
              </Label>
              <select
                id="car-type"
                value={type}
                disabled={loading}
                onChange={(e) => setType(e.target.value as CarType)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-xs focus:border-blue-500 focus:outline-none"
              >
                {CAR_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="car-seats"
                className="text-xs font-semibold text-gray-700"
              >
                Tổng số ghế <span className="text-red-500">*</span>
              </Label>
              <Input
                id="car-seats"
                type="number"
                min={1}
                max={100}
                placeholder="40"
                value={totalSeats}
                disabled={loading}
                onChange={(e) =>
                  setTotalSeats(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, totalSeats: true }))
                }
                className={`text-sm ${
                  seatsError ? "border-red-400 focus-visible:ring-red-400" : ""
                }`}
              />
              {seatsError && (
                <p className="text-[11px] font-medium text-red-600">
                  {seatsError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 sm:space-x-2">
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
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  <span>Lưu thông tin</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
