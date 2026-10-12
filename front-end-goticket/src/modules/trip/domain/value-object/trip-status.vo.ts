export type TripStatus = "DRAFT" | "SCHEDULED" | "DEPARTED" | "COMPLETED" | "CANCELLED" | "PUBLISHING" | "ON_SALE" | "STOP_SALE";

export const TRIP_STATUS = {
  DRAFT: "DRAFT" as TripStatus,
  SCHEDULED: "SCHEDULED" as TripStatus,
  DEPARTED: "DEPARTED" as TripStatus,
  COMPLETED: "COMPLETED" as TripStatus,
  CANCELLED: "CANCELLED" as TripStatus,
  PUBLISHING: "PUBLISHING" as TripStatus,
  ON_SALE: "ON_SALE" as TripStatus,
  STOP_SALE: "STOP_SALE" as TripStatus,
} as const;

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  DRAFT: "Bản nháp",
  SCHEDULED: "Sắp chạy",
  DEPARTED: "Đang chạy",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  PUBLISHING: "Đang phát hành",
  ON_SALE: "Đang mở bán",
  STOP_SALE: "Dừng bán vé",
};

export const TRIP_STATUS_BADGE_CLASSES: Record<TripStatus, string> = {
  DRAFT: "bg-stone-50 text-stone-700 border-stone-200 ring-stone-600/20",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20",
  DEPARTED: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
  PUBLISHING: "bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20",
  ON_SALE: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
  STOP_SALE: "bg-gray-100 text-gray-700 border-gray-300 ring-gray-600/20",
};

export class TripStatusVO {
  public static isValid(status: string): status is TripStatus {
    return (
      status === TRIP_STATUS.DRAFT ||
      status === TRIP_STATUS.SCHEDULED ||
      status === TRIP_STATUS.DEPARTED ||
      status === TRIP_STATUS.COMPLETED ||
      status === TRIP_STATUS.CANCELLED ||
      status === TRIP_STATUS.PUBLISHING ||
      status === TRIP_STATUS.ON_SALE ||
      status === TRIP_STATUS.STOP_SALE
    );
  }

  public static getLabel(status: TripStatus | string): string {
    if (status === TRIP_STATUS.DRAFT) return TRIP_STATUS_LABELS.DRAFT;
    if (status === TRIP_STATUS.SCHEDULED) return TRIP_STATUS_LABELS.SCHEDULED;
    if (status === TRIP_STATUS.DEPARTED) return TRIP_STATUS_LABELS.DEPARTED;
    if (status === TRIP_STATUS.COMPLETED) return TRIP_STATUS_LABELS.COMPLETED;
    if (status === TRIP_STATUS.CANCELLED) return TRIP_STATUS_LABELS.CANCELLED;
    if (status === TRIP_STATUS.PUBLISHING) return TRIP_STATUS_LABELS.PUBLISHING;
    if (status === TRIP_STATUS.ON_SALE) return TRIP_STATUS_LABELS.ON_SALE;
    if (status === TRIP_STATUS.STOP_SALE) return TRIP_STATUS_LABELS.STOP_SALE;
    return status || "Không xác định";
  }

  public static getBadgeClasses(status: TripStatus | string): string {
    if (status === TRIP_STATUS.DRAFT)
      return TRIP_STATUS_BADGE_CLASSES.DRAFT;
    if (status === TRIP_STATUS.SCHEDULED)
      return TRIP_STATUS_BADGE_CLASSES.SCHEDULED;
    if (status === TRIP_STATUS.DEPARTED)
      return TRIP_STATUS_BADGE_CLASSES.DEPARTED;
    if (status === TRIP_STATUS.COMPLETED)
      return TRIP_STATUS_BADGE_CLASSES.COMPLETED;
    if (status === TRIP_STATUS.CANCELLED)
      return TRIP_STATUS_BADGE_CLASSES.CANCELLED;
    if (status === TRIP_STATUS.PUBLISHING)
      return TRIP_STATUS_BADGE_CLASSES.PUBLISHING;
    if (status === TRIP_STATUS.ON_SALE)
      return TRIP_STATUS_BADGE_CLASSES.ON_SALE;
    if (status === TRIP_STATUS.STOP_SALE)
      return TRIP_STATUS_BADGE_CLASSES.STOP_SALE;
    return "bg-gray-100 text-gray-600 border-gray-200";
  }

  public static canTransition(
    from: TripStatus,
    to: TripStatus
  ): { allowed: boolean; reason?: string } {
    if (from === to) {
      return {
        allowed: false,
        reason: `Chuyến xe hiện đã ở trạng thái ${TripStatusVO.getLabel(from)} trước đó.`,
      };
    }

    if (from === TRIP_STATUS.COMPLETED) {
      return {
        allowed: false,
        reason:
          "Chuyến xe đã hoàn thành hành trình, không thể thay đổi trạng thái.",
      };
    }

    if (from === TRIP_STATUS.CANCELLED) {
      return {
        allowed: false,
        reason: "Chuyến xe này đã bị hủy, không thể thay đổi trạng thái.",
      };
    }

    if (from === TRIP_STATUS.DEPARTED && to === TRIP_STATUS.CANCELLED) {
      return {
        allowed: false,
        reason:
          "Chuyến xe đã xuất bến và đang trong hành trình di chuyển, không thể hủy chuyến.",
      };
    }

    if (from === TRIP_STATUS.SCHEDULED && to === TRIP_STATUS.COMPLETED) {
      return {
        allowed: false,
        reason:
          "Chỉ chuyến xe đang chạy (DEPARTED) mới có thể đánh dấu hoàn thành.",
      };
    }

    if (from === TRIP_STATUS.DEPARTED && to === TRIP_STATUS.SCHEDULED) {
      return {
        allowed: false,
        reason: "Chuyến xe đã xuất bến không thể đảo ngược về sắp chạy.",
      };
    }

    return { allowed: true };
  }
}
