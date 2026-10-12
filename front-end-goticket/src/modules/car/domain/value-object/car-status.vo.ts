export type CarStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export const CAR_STATUS_CONFIG = {
  ACTIVE: {
    value: "ACTIVE" as CarStatus,
    label: "Đang hoạt động",
    badgeClasses: {
      border: "border-green-200",
      bg: "bg-green-50",
      text: "text-green-700",
    },
  },
  MAINTENANCE: {
    value: "MAINTENANCE" as CarStatus,
    label: "Bảo dưỡng",
    badgeClasses: {
      border: "border-orange-200",
      bg: "bg-orange-50",
      text: "text-orange-700",
    },
  },
  INACTIVE: {
    value: "INACTIVE" as CarStatus,
    label: "Ngừng hoạt động",
    badgeClasses: {
      border: "border-gray-200",
      bg: "bg-gray-100",
      text: "text-gray-600",
    },
  },
} as const;
