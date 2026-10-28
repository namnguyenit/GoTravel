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
import { RouteLocationVO } from "../../domain/value-object/route-location.vo";
import { RouteStopVO } from "../../domain/value-object/route-stop.vo";
import type { RouteEntity } from "../../domain/entity/route.entity";
import { routeService } from "../../composition";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";
import { ProvinceCombobox } from "@/shared/presentation/components";
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
  ListPlus,
  Building2,
  Check,
  Search,
  ArrowRight,
  Pencil,
} from "lucide-react";

interface CreateRouteModalProps {
  open: boolean;
  initialRoute?: RouteEntity | null;
  onClose: () => void;
  onSuccess: (route: RouteEntity) => void;
}

interface StopItem {
  id: string;
  name: string;
  address?: string;
  province?: string;
}

interface OperatorStop {
  id: string;
  name: string;
  address?: string;
  province?: string;
  active?: boolean;
}

type PickerTarget =
  | { type: "origin_main" }
  | { type: "dest_main" }
  | { type: "origin_transit"; index: number }
  | { type: "dest_transit"; index: number }
  | { type: "multi_origin" }
  | { type: "multi_dest" }
  | null;

export const CreateRouteModal: React.FC<CreateRouteModalProps> = ({
  open,
  initialRoute,
  onClose,
  onSuccess,
}) => {
  const isEditMode = Boolean(initialRoute);

  // 1. Tỉnh thành
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  // 2. Nhóm điểm đầu (Khởi hành)
  const [originMainStop, setOriginMainStop] = useState<StopItem>({
    id: "origin-main",
    name: "",
  });
  const [originTransits, setOriginTransits] = useState<StopItem[]>([]);

  // 3. Nhóm điểm cuối (Đích đến)
  const [destMainStop, setDestMainStop] = useState<StopItem>({
    id: "dest-main",
    name: "",
  });
  const [destTransits, setDestTransits] = useState<StopItem[]>([]);

  const [touched, setTouched] = useState<{
    origin?: boolean;
    destination?: boolean;
    originMain?: boolean;
    destMain?: boolean;
  }>({});

  // Danh mục trạm của nhà xe
  const [operatorStops, setOperatorStops] = useState<OperatorStop[]>([]);
  const [loadingStops, setLoadingStops] = useState<boolean>(false);

  // Stop Picker Modal State
  const [showStopsPicker, setShowStopsPicker] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerFilterProvince, setPickerFilterProvince] = useState<string>("");
  const [pickerSearch, setPickerSearch] = useState<string>("");
  const [selectedPickerStops, setSelectedPickerStops] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Điền dữ liệu khi ở chế độ Sửa (Edit Mode)
  useEffect(() => {
    if (!open) return;

    resetForm();

    if (initialRoute) {
      setOrigin(initialRoute.origin || "");
      setDestination(initialRoute.destination || "");

      const sortedStops = initialRoute.getStopsSorted();
      if (sortedStops.length >= 2) {
        const first = sortedStops[0];
        const last = sortedStops[sortedStops.length - 1];

        setOriginMainStop({
          id: first.id || "origin-main",
          name: first.name || "",
          address: first.address,
          province: first.province,
        });
        setDestMainStop({
          id: last.id || "dest-main",
          name: last.name || "",
          address: last.address,
          province: last.province,
        });

        const intermediate = sortedStops.slice(1, -1);
        const destLower = (initialRoute.destination || "").toLowerCase();

        const origT: StopItem[] = [];
        const destT: StopItem[] = [];

        // Split only at the first destination stop, preserving the saved order.
        const destinationIndex = intermediate.findIndex(
          (s) => s.province?.toLowerCase().trim() === destLower.trim(),
        );
        intermediate.forEach((s, idx) => {
          const item: StopItem = {
            id: s.id || `transit-${idx}`,
            name: s.name || "",
            address: s.address,
            province: s.province,
          };
          if (destinationIndex < 0 || idx < destinationIndex) {
            origT.push(item);
          } else {
            destT.push(item);
          }
        });

        setOriginTransits(origT);
        setDestTransits(destT);
      }
    } else {
      resetForm();
    }
  }, [open, initialRoute]);

  // Tải danh mục điểm đón/trả của nhà xe
  useEffect(() => {
    if (!open) return;
    const fetchOperatorStops = async () => {
      try {
        setLoadingStops(true);
        const res = await httpClient.get<any>("/api/v1/operators/me/stops");
        const list = Array.isArray(res?.stops)
          ? res.stops
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        setOperatorStops(list.filter((s: any) => s.active !== false));
      } catch {
        // Không block modal nếu không tải được stops
      } finally {
        setLoadingStops(false);
      }
    };
    fetchOperatorStops();
  }, [open]);

  const resetForm = () => {
    setOrigin("");
    setDestination("");
    setOriginMainStop({ id: `origin-main-${Date.now()}`, name: "" });
    setOriginTransits([]);
    setDestMainStop({ id: `dest-main-${Date.now()}`, name: "" });
    setDestTransits([]);
    setTouched({});
    setApiError(null);
    setSuccessMessage(null);
    setShowStopsPicker(false);
    setPickerTarget(null);
    setSelectedPickerStops([]);
    setPickerSearch("");
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const formatStopDisplayName = (stop: OperatorStop) => {
    return stop.name;
  };

  const originOperatorStops = useMemo(() => {
    if (!origin) return [];
    const originLower = origin.toLowerCase().trim();
    return operatorStops.filter(
      (s) =>
        s.province &&
        (s.province.toLowerCase().includes(originLower) ||
          originLower.includes(s.province.toLowerCase()))
    );
  }, [origin, operatorStops]);

  const destOperatorStops = useMemo(() => {
    if (!destination) return [];
    const destLower = destination.toLowerCase().trim();
    return operatorStops.filter(
      (s) =>
        s.province &&
        (s.province.toLowerCase().includes(destLower) ||
          destLower.includes(s.province.toLowerCase()))
    );
  }, [destination, operatorStops]);

  // Thao tác trạm đón
  const handleAddOriginTransit = () => {
    setOriginTransits((prev) => [
      ...prev,
      { id: `orig-transit-${Date.now()}-${Math.random()}`, name: "" },
    ]);
  };

  const handleRemoveOriginTransit = (index: number) => {
    setOriginTransits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveOriginTransitUp = (index: number) => {
    if (index <= 0) return;
    setOriginTransits((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveOriginTransitDown = (index: number) => {
    if (index >= originTransits.length - 1) return;
    setOriginTransits((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Thao tác trạm trả
  const handleAddDestTransit = () => {
    setDestTransits((prev) => [
      ...prev,
      { id: `dest-transit-${Date.now()}-${Math.random()}`, name: "" },
    ]);
  };

  const handleRemoveDestTransit = (index: number) => {
    setDestTransits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveDestTransitUp = (index: number) => {
    if (index <= 0) return;
    setDestTransits((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDestTransitDown = (index: number) => {
    if (index >= destTransits.length - 1) return;
    setDestTransits((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Mở Picker
  const openPicker = (target: PickerTarget, preferredProvince?: string) => {
    setPickerTarget(target);
    setPickerFilterProvince(preferredProvince || "");
    setPickerSearch("");
    setSelectedPickerStops([]);
    setShowStopsPicker(true);
  };

  // Chọn trạm đơn lẻ
  const handleSelectSingleStop = (stop: OperatorStop) => {
    const formatted = formatStopDisplayName(stop);

    if (pickerTarget?.type === "origin_main") {
      setOriginMainStop({
        id: `origin-main-${stop.id}`,
        name: formatted,
        address: stop.address,
        province: stop.province,
      });
      setTouched((prev) => ({ ...prev, originMain: true }));
    } else if (pickerTarget?.type === "dest_main") {
      setDestMainStop({
        id: `dest-main-${stop.id}`,
        name: formatted,
        address: stop.address,
        province: stop.province,
      });
      setTouched((prev) => ({ ...prev, destMain: true }));
    } else if (pickerTarget?.type === "origin_transit") {
      const idx = pickerTarget.index;
      setOriginTransits((prev) => {
        const copy = [...prev];
        if (copy[idx]) {
          copy[idx] = {
            ...copy[idx],
            name: formatted,
            address: stop.address,
            province: stop.province,
          };
        }
        return copy;
      });
    } else if (pickerTarget?.type === "dest_transit") {
      const idx = pickerTarget.index;
      setDestTransits((prev) => {
        const copy = [...prev];
        if (copy[idx]) {
          copy[idx] = {
            ...copy[idx],
            name: formatted,
            address: stop.address,
            province: stop.province,
          };
        }
        return copy;
      });
    }

    setShowStopsPicker(false);
    setPickerTarget(null);
  };

  // Chọn nhiều trạm
  const handleApplyMultiStops = () => {
    const selectedList = operatorStops.filter((s) =>
      selectedPickerStops.includes(s.id)
    );

    if (pickerTarget?.type === "multi_origin") {
      const newItems: StopItem[] = selectedList.map((s) => ({
        id: `orig-transit-${s.id}-${Date.now()}`,
        name: formatStopDisplayName(s),
        address: s.address,
        province: s.province,
      }));
      setOriginTransits((prev) => [...prev, ...newItems]);
    } else if (pickerTarget?.type === "multi_dest") {
      const newItems: StopItem[] = selectedList.map((s) => ({
        id: `dest-transit-${s.id}-${Date.now()}`,
        name: formatStopDisplayName(s),
        address: s.address,
        province: s.province,
      }));
      setDestTransits((prev) => [...prev, ...newItems]);
    }

    setShowStopsPicker(false);
    setPickerTarget(null);
    setSelectedPickerStops([]);
  };

  const filteredPickerStops = useMemo(() => {
    let list = operatorStops;
    if (pickerFilterProvince) {
      const provLower = pickerFilterProvince.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.province &&
          (s.province.toLowerCase().includes(provLower) ||
            provLower.includes(s.province.toLowerCase()))
      );
    }
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q)) ||
          (s.province && s.province.toLowerCase().includes(q))
      );
    }
    return list;
  }, [operatorStops, pickerFilterProvince, pickerSearch]);

  const locationErrors = RouteLocationVO.validate(origin, destination);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setTouched({
      origin: true,
      destination: true,
      originMain: true,
      destMain: true,
    });
    setApiError(null);
    setSuccessMessage(null);

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

    if (!originMainStop.name.trim() || originMainStop.name.trim().length < 3) {
      setApiError(`Vui lòng nhập tên Bến xe xuất phát chính (tối thiểu 3 ký tự).`);
      return;
    }

    if (!destMainStop.name.trim() || destMainStop.name.trim().length < 3) {
      setApiError(`Vui lòng nhập tên Bến xe trả khách chính (tối thiểu 3 ký tự).`);
      return;
    }

    const assembledStops: Array<{
      name: string;
      order: number;
      address?: string;
      province?: string;
    }> = [];

    let orderIdx = 0;

    // 1. Trạm chính xuất phát
    assembledStops.push({
      name: originMainStop.name.trim(),
      order: orderIdx++,
      address: originMainStop.address,
      province: originMainStop.province || origin.trim(),
    });

    // 2. Điểm đón trung chuyển
    for (const t of originTransits) {
      const name = t.name.trim();
      if (name) {
        if (name.length < 3) {
          setApiError(`Tên điểm trung chuyển "${name}" quá ngắn (tối thiểu 3 ký tự).`);
          return;
        }
        assembledStops.push({
          name,
          order: orderIdx++,
          address: t.address,
          province: t.province || origin.trim(),
        });
      }
    }

    // 3. Điểm trả trung chuyển
    for (const t of destTransits) {
      const name = t.name.trim();
      if (name) {
        if (name.length < 3) {
          setApiError(`Tên điểm trung chuyển "${name}" quá ngắn (tối thiểu 3 ký tự).`);
          return;
        }
        assembledStops.push({
          name,
          order: orderIdx++,
          address: t.address,
          province: t.province || destination.trim(),
        });
      }
    }

    // 4. Trạm chính trả khách
    assembledStops.push({
      name: destMainStop.name.trim(),
      order: orderIdx++,
      address: destMainStop.address,
      province: destMainStop.province || destination.trim(),
    });

    const stopsValidation = RouteStopVO.validateStopsList(assembledStops);
    if (!stopsValidation.isValid) {
      setApiError(stopsValidation.error || "Danh sách điểm dừng không hợp lệ.");
      return;
    }

    setLoading(true);

    try {
      let savedRoute: RouteEntity;

      if (isEditMode && initialRoute) {
        savedRoute = await routeService.updateRoute(initialRoute.id, {
          origin: origin.trim(),
          destination: destination.trim(),
          stops: assembledStops,
        });
        setSuccessMessage("Cập nhật tuyến đường thành công!");
      } else {
        savedRoute = await routeService.createRoute({
          origin: origin.trim(),
          destination: destination.trim(),
          stops: assembledStops,
        });
        setSuccessMessage("Tạo tuyến đường mới thành công!");
      }

      onSuccess(savedRoute);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Thao tác trên tuyến đường thất bại.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isMultiPicker =
    pickerTarget?.type === "multi_origin" ||
    pickerTarget?.type === "multi_dest";

  const totalAllStops =
    1 + originTransits.length + destTransits.length + 1;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-6 sm:rounded-[28px] border border-gray-100 shadow-2xl bg-white">
          <DialogHeader className="space-y-1.5 text-left pb-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#FF385C]">
              {isEditMode ? <Pencil className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              <span>{isEditMode ? "Chỉnh Sửa Lộ Trình" : "Thiết Lập Tuyến Đường"}</span>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? "Chỉnh sửa tuyến đường" : "Tạo tuyến đường mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Thiết lập điểm khởi hành, điểm đến và các trạm đón/trả của tuyến xe.
            </DialogDescription>
          </DialogHeader>

          {/* Banner lỗi */}
          {apiError && (
            <div className="flex items-center space-x-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Banner thành công */}
          {successMessage && (
            <div className="flex items-center space-x-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 py-1">
            {/* 1. Tỉnh thành xuất phát và đích đến */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                1. Điểm đi & Điểm đến
              </span>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <ProvinceCombobox
                  label="Điểm khởi hành"
                  required
                  value={origin}
                  onChange={(val) => {
                    setOrigin(val);
                    setTouched((prev) => ({ ...prev, origin: true }));
                  }}
                  excludeProvince={destination}
                  error={
                    touched.origin
                      ? locationErrors.originError || undefined
                      : undefined
                  }
                  placeholder="Chọn tỉnh xuất phát..."
                />

                <ProvinceCombobox
                  label="Điểm đến"
                  required
                  value={destination}
                  onChange={(val) => {
                    setDestination(val);
                    setTouched((prev) => ({ ...prev, destination: true }));
                  }}
                  excludeProvince={origin}
                  error={
                    (touched.destination
                      ? locationErrors.destinationError || undefined
                      : undefined) ||
                    (locationErrors.matchError || undefined)
                  }
                  placeholder="Chọn tỉnh đích đến..."
                />
              </div>
            </div>

            {/* 2. Lộ trình trạm đón và trạm trả */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                  2. Lộ trình trạm dừng ({totalAllStops} điểm)
                </span>
              </div>

              {/* KHỐI 1: ĐIỂM ĐÓN & TRUNG CHUYỂN KHỞI HÀNH */}
              <div className="rounded-2xl border border-gray-200/90 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#111827] text-white">
                      <Navigation className="h-3 w-3 fill-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">
                      Điểm đón tại {origin || "khởi hành"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {origin && originOperatorStops.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openPicker({ type: "multi_origin" }, origin)}
                        className="h-7 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-full border-gray-200"
                      >
                        <ListPlus className="mr-1 h-3 w-3 text-gray-500" />
                        <span>Trạm đã lưu ({originOperatorStops.length})</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOriginTransit}
                      className="h-7 text-[11px] font-bold text-[#FF385C] border-[#FF385C]/30 bg-white hover:bg-[#FFF0F2] rounded-full"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      <span>Thêm điểm đón</span>
                    </Button>
                  </div>
                </div>

                {/* Bến chính xuất phát */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-gray-700">
                      Bến xe xuất phát chính *
                    </Label>
                    <button
                      type="button"
                      onClick={() => openPicker({ type: "origin_main" }, origin)}
                      className="text-[11px] font-semibold text-[#FF385C] hover:underline cursor-pointer"
                    >
                      Chọn trạm
                    </button>
                  </div>
                  <Input
                    type="text"
                    value={originMainStop.name}
                    onChange={(e) => {
                      setOriginMainStop((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                      setTouched((prev) => ({ ...prev, originMain: true }));
                    }}
                    placeholder={`VD: Bến xe Yên Nghĩa... (${origin || "Tỉnh khởi hành"})`}
                    className={`h-9 text-xs sm:text-sm font-medium bg-white rounded-xl ${
                      touched.originMain &&
                      (!originMainStop.name.trim() || originMainStop.name.trim().length < 3)
                        ? "border-rose-300 bg-rose-50/40"
                        : "border-gray-200"
                    }`}
                  />
                </div>

                {/* Danh sách trung chuyển đón */}
                {originTransits.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Trung chuyển đón tận nơi ({originTransits.length})
                    </span>
                    {originTransits.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xs"
                      >
                        <span className="flex h-6 px-2 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-700">
                          #{idx + 1}
                        </span>
                        <Input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOriginTransits((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], name: val };
                              return copy;
                            });
                          }}
                          placeholder="Tên điểm đón, trường học, ngã tư..."
                          className="h-8 text-xs font-medium border-0 focus-visible:ring-0 shadow-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openPicker({ type: "origin_transit", index: idx }, origin)
                          }
                          className="h-7 px-2 text-[11px] text-gray-600 hover:text-gray-900 shrink-0"
                          title="Chọn từ trạm đã lưu"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex items-center shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleMoveOriginTransitUp(idx)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === originTransits.length - 1}
                            onClick={() => handleMoveOriginTransitDown(idx)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOriginTransit(idx)}
                          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 shrink-0"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic pt-0.5">
                    Chưa có điểm trung chuyển đón. Bấm "Thêm điểm đón" nếu nhà xe có hỗ trợ trung chuyển.
                  </p>
                )}
              </div>

              {/* KHỐI 2: ĐIỂM TRẢ & TRUNG CHUYỂN ĐÍCH ĐẾN */}
              <div className="rounded-2xl border border-gray-200/90 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF385C] text-white">
                      <Flag className="h-3 w-3 fill-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">
                      Điểm trả tại {destination || "đích đến"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {destination && destOperatorStops.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openPicker({ type: "multi_dest" }, destination)}
                        className="h-7 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-full border-gray-200"
                      >
                        <ListPlus className="mr-1 h-3 w-3 text-gray-500" />
                        <span>Trạm đã lưu ({destOperatorStops.length})</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddDestTransit}
                      className="h-7 text-[11px] font-bold text-[#FF385C] border-[#FF385C]/30 bg-white hover:bg-[#FFF0F2] rounded-full"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      <span>Thêm điểm trả</span>
                    </Button>
                  </div>
                </div>

                {/* Danh sách trung chuyển trả */}
                {destTransits.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Trung chuyển trả tận nơi ({destTransits.length})
                    </span>
                    {destTransits.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xs"
                      >
                        <span className="flex h-6 px-2 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-700">
                          #{idx + 1}
                        </span>
                        <Input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDestTransits((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], name: val };
                              return copy;
                            });
                          }}
                          placeholder="Tên điểm trả, khách sạn, bệnh viện..."
                          className="h-8 text-xs font-medium border-0 focus-visible:ring-0 shadow-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openPicker({ type: "dest_transit", index: idx }, destination)
                          }
                          className="h-7 px-2 text-[11px] text-gray-600 hover:text-gray-900 shrink-0"
                          title="Chọn từ trạm đã lưu"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex items-center shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleMoveDestTransitUp(idx)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === destTransits.length - 1}
                            onClick={() => handleMoveDestTransitDown(idx)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDestTransit(idx)}
                          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 shrink-0"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    Chưa có điểm trung chuyển trả. Bấm "Thêm điểm trả" nếu nhà xe có hỗ trợ trung chuyển.
                  </p>
                )}

                {/* Bến chính trả khách */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-gray-700">
                      Bến xe trả khách chính *
                    </Label>
                    <button
                      type="button"
                      onClick={() => openPicker({ type: "dest_main" }, destination)}
                      className="text-[11px] font-semibold text-[#FF385C] hover:underline cursor-pointer"
                    >
                      Chọn trạm
                    </button>
                  </div>
                  <Input
                    type="text"
                    value={destMainStop.name}
                    onChange={(e) => {
                      setDestMainStop((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                      setTouched((prev) => ({ ...prev, destMain: true }));
                    }}
                    placeholder={`VD: Bến xe Trung tâm Đà Nẵng... (${destination || "Tỉnh đích đến"})`}
                    className={`h-9 text-xs sm:text-sm font-medium bg-white rounded-xl ${
                      touched.destMain &&
                      (!destMainStop.name.trim() || destMainStop.name.trim().length < 3)
                        ? "border-rose-300 bg-rose-50/40"
                        : "border-gray-200"
                    }`}
                  />
                </div>
              </div>

              {/* TÓM TẮT LỘ TRÌNH (PREVIEW) */}
              {(originMainStop.name.trim() || destMainStop.name.trim()) && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Thứ tự lộ trình xe chạy:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 text-gray-800 px-2.5 py-0.5 font-bold text-[11px]">
                      <Navigation className="h-3 w-3 text-[#FF385C]" />
                      {originMainStop.name.trim() || "Bến xuất phát"}
                    </span>

                    {originTransits
                      .filter((t) => t.name.trim())
                      .map((t, i) => (
                        <React.Fragment key={t.id || i}>
                          <ArrowRight className="h-3 w-3 text-gray-300" />
                          <span className="inline-flex items-center rounded-full bg-white border border-gray-200 text-gray-700 px-2.5 py-0.5 text-[11px]">
                            {t.name}
                          </span>
                        </React.Fragment>
                      ))}

                    <ArrowRight className="h-3 w-3 text-gray-400 font-bold" />
                    <span className="text-[11px] text-gray-400 italic px-1">
                      Hành trình liên tỉnh
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-400 font-bold" />

                    {destTransits
                      .filter((t) => t.name.trim())
                      .map((t, i) => (
                        <React.Fragment key={t.id || i}>
                          <span className="inline-flex items-center rounded-full bg-white border border-gray-200 text-gray-700 px-2.5 py-0.5 text-[11px]">
                            {t.name}
                          </span>
                          <ArrowRight className="h-3 w-3 text-gray-300" />
                        </React.Fragment>
                      ))}

                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 text-gray-800 px-2.5 py-0.5 font-bold text-[11px]">
                      <Flag className="h-3 w-3 text-gray-900" />
                      {destMainStop.name.trim() || "Bến trả khách"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={handleClose}
                className="rounded-full text-xs font-semibold"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="rounded-full bg-[#FF385C] text-white hover:bg-[#E61E4F] font-bold shadow-md glow-coral-sm text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    <span>{isEditMode ? "Lưu thay đổi" : "Lưu tuyến đường"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Chọn Điểm đón/trả từ danh mục */}
      <Dialog open={showStopsPicker} onOpenChange={setShowStopsPicker}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-5 rounded-[28px] border border-gray-100 shadow-2xl bg-white">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-gray-900">
              {isMultiPicker ? "Chọn điểm trung chuyển" : "Chọn trạm dừng"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Chọn trạm từ danh mục đã tạo của nhà xe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 pt-1">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Tìm tên bến, địa chỉ..."
                className="pl-9 h-8 text-xs rounded-xl"
              />
            </div>

            {/* Filter tags */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setPickerFilterProvince("")}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                  !pickerFilterProvince
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tất cả ({operatorStops.length})
              </button>
              {origin && (
                <button
                  type="button"
                  onClick={() => setPickerFilterProvince(origin)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                    pickerFilterProvince === origin
                      ? "bg-[#FF385C] text-white"
                      : "bg-[#FFF0F2] text-[#FF385C] hover:bg-[#FFE0E5]"
                  }`}
                >
                  {origin} ({originOperatorStops.length})
                </button>
              )}
              {destination && (
                <button
                  type="button"
                  onClick={() => setPickerFilterProvince(destination)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                    pickerFilterProvince === destination
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {destination} ({destOperatorStops.length})
                </button>
              )}
            </div>
          </div>

          {loadingStops ? (
            <div className="py-6 text-center text-xs text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#FF385C] mb-1.5" />
              Đang tải danh sách...
            </div>
          ) : filteredPickerStops.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400 italic">
              Không tìm thấy trạm dừng nào.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredPickerStops.map((stop) => {
                const isSelected = selectedPickerStops.includes(stop.id);

                return (
                  <div
                    key={stop.id}
                    onClick={() => {
                      if (!isMultiPicker) {
                        handleSelectSingleStop(stop);
                      } else {
                        setSelectedPickerStops((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== stop.id)
                            : [...prev, stop.id]
                        );
                      }
                    }}
                    className={`flex items-start justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "border-[#FF385C] bg-[#FFF0F2]"
                        : "border-gray-200/80 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-gray-900">
                          {stop.name}
                        </strong>
                        {stop.province && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.2 text-[9px] font-semibold text-gray-600">
                            {stop.province}
                          </span>
                        )}
                      </div>
                      {stop.address && (
                        <p className="text-[10px] text-gray-500">
                          {stop.address}
                        </p>
                      )}
                    </div>

                    {!isMultiPicker ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSingleStop(stop);
                        }}
                        className="h-6 text-[10px] bg-[#FF385C] text-white rounded-full font-bold px-2.5 shrink-0"
                      >
                        Chọn
                      </Button>
                    ) : (
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 ${
                          isSelected
                            ? "bg-[#FF385C] border-[#FF385C] text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowStopsPicker(false);
                setSelectedPickerStops([]);
                setPickerTarget(null);
              }}
              className="rounded-full text-xs"
            >
              Hủy
            </Button>
            {isMultiPicker && (
              <Button
                type="button"
                size="sm"
                onClick={handleApplyMultiStops}
                disabled={selectedPickerStops.length === 0}
                className="rounded-full bg-[#FF385C] text-white hover:bg-[#E61E4F] font-bold text-xs"
              >
                Thêm {selectedPickerStops.length} điểm
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
