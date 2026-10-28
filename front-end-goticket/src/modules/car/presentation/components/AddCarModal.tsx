import React, { useEffect, useState } from "react";
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { DEFAULT_SEAT_CLASSES, type SeatClassOption } from '../../domain/seat-classes';
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
  const [deckCount, setDeckCount] = useState(2);
  const [seatColumns, setSeatColumns] = useState(3);
  const [lowerDeckSeats, setLowerDeckSeats] = useState(20);
  const [seatClass, setSeatClass] = useState('STANDARD');
  const [seatClasses, setSeatClasses] = useState<SeatClassOption[]>(DEFAULT_SEAT_CLASSES);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void httpClient.get<SeatClassOption[]>('/api/v1/cars/seat-classes').then(rows => {
      if (active) setSeatClasses(rows);
    }).catch(() => { /* Built-in classes remain available when the catalog cannot load. */ });
    return () => { active = false; };
  }, [open]);

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
    setDeckCount(2);
    setSeatColumns(3);
    setLowerDeckSeats(20);
    setSeatClass('STANDARD');
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
    if (loading) return;
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

    if (totalSeats === "" || !Number.isInteger(Number(totalSeats)) || Number(totalSeats) <= 0 || Number(totalSeats) > 100) {
      setApiError("Tổng số ghế phải là số nguyên từ 1 đến 100.");
      return;
    }

    setLoading(true);

    if (deckCount === 2 && (!Number.isInteger(lowerDeckSeats) || lowerDeckSeats < 1 || lowerDeckSeats >= Number(totalSeats))) {
      setApiError('Xe hai tầng cần ít nhất một ghế ở mỗi tầng.');
      setLoading(false);
      return;
    }

    try {
      const newCar = await carService.addCar({
        name: name.trim(),
        type,
        licensePlate: LicensePlateVO.normalize(licensePlate),
        totalSeats: Number(totalSeats),
        deckCount,
        seatColumns,
        lowerDeckSeats: deckCount === 1 ? Number(totalSeats) : lowerDeckSeats,
        seatClass,
      });

      setSuccessMessage("Thêm xe mới thành công!");

      resetForm();
      onSuccess(newCar);
      onClose();
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
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto p-6 sm:rounded-2xl">
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
                onChange={(e) => {
                  const next = e.target.value as CarType;
                  setType(next);
                  setDeckCount(next === 'SLEEPER' ? 2 : 1);
                  setLowerDeckSeats(Math.ceil(Number(totalSeats) / 2));
                }}
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
                onChange={(e) => {
                  setTotalSeats(
                    e.target.value === "" ? "" : Number(e.target.value)
                  );
                  setLowerDeckSeats(Math.ceil(Number(e.target.value) / 2));
                }}
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

          <fieldset className="space-y-3 rounded-xl border border-gray-200 p-3" disabled={loading}>
            <legend className="px-1 text-sm font-semibold">Tầng và sơ đồ ghế</legend>
            <label className="block text-sm">Số tầng
              <select aria-label="Số tầng" value={deckCount} onChange={e => setDeckCount(Number(e.target.value))} className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 text-base">
                <option value={1}>1 tầng</option><option value={2}>2 tầng</option>
              </select>
            </label>
            <label className="block text-sm">Số cột ghế mỗi tầng
              <select aria-label="Số cột ghế" value={seatColumns} onChange={e => setSeatColumns(Number(e.target.value))} className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 text-base">
                <option value={3}>3 cột (mặc định)</option><option value={2}>2 cột</option><option value={4}>4 cột</option>
              </select>
            </label>
            {deckCount === 2 ? <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Ghế tầng 1<input aria-label="Ghế tầng 1" type="number" min={1} max={Number(totalSeats) - 1} value={lowerDeckSeats} onChange={e => setLowerDeckSeats(Number(e.target.value))} className="mt-1 min-h-10 w-full rounded-lg border px-3 text-base" /></label>
              <p className="text-sm">Ghế tầng 2<strong className="mt-1 block py-2">{Math.max(0, Number(totalSeats) - lowerDeckSeats)} ghế</strong></p>
            </div> : <p className="text-sm text-gray-600">Tầng 1: {totalSeats || 0} ghế</p>}
            <label className="block text-sm">Hạng ghế ban đầu
              <select aria-label="Hạng ghế ban đầu" value={seatClass} onChange={e => setSeatClass(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 text-base">
                {seatClasses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </label>
            <p className="text-sm text-gray-600">Sơ đồ {seatColumns} cột được lưu tự động cùng xe. Ghế tầng 1 dùng mã A, tầng 2 dùng mã B; bạn có thể chỉnh lại sau.</p>
          </fieldset>

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
