export type RouteStatus = "ACTIVE" | "INACTIVE";

export const ROUTE_STATUS = {
  ACTIVE: "ACTIVE" as RouteStatus,
  INACTIVE: "INACTIVE" as RouteStatus,
} as const;

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Tạm ngừng",
};

export const ROUTE_STATUS_BADGE_CLASSES: Record<RouteStatus, string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
  INACTIVE: "bg-zinc-100 text-zinc-600 border-zinc-200 ring-zinc-500/20",
};

export class RouteStatusVO {
  public static isValid(status: string): status is RouteStatus {
    return status === ROUTE_STATUS.ACTIVE || status === ROUTE_STATUS.INACTIVE;
  }

  public static getLabel(status: RouteStatus | string): string {
    if (status === ROUTE_STATUS.ACTIVE) return ROUTE_STATUS_LABELS.ACTIVE;
    if (status === ROUTE_STATUS.INACTIVE) return ROUTE_STATUS_LABELS.INACTIVE;
    return status || "Không xác định";
  }

  public static getBadgeClasses(status: RouteStatus | string): string {
    if (status === ROUTE_STATUS.ACTIVE)
      return ROUTE_STATUS_BADGE_CLASSES.ACTIVE;
    if (status === ROUTE_STATUS.INACTIVE)
      return ROUTE_STATUS_BADGE_CLASSES.INACTIVE;
    return "bg-gray-100 text-gray-600 border-gray-200";
  }

  public static getOppositeStatus(currentStatus: RouteStatus): RouteStatus {
    return currentStatus === ROUTE_STATUS.ACTIVE
      ? ROUTE_STATUS.INACTIVE
      : ROUTE_STATUS.ACTIVE;
  }
}
