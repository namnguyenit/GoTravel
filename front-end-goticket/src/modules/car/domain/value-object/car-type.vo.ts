export type CarType = "SLEEPER" | "LIMOUSINE" | "SEAT";

export const CAR_TYPE_CONFIG = {
  SLEEPER: {
    value: "SLEEPER" as CarType,
    label: "Xe giường nằm",
    shortLabel: "Giường nằm",
    badgeClasses: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
  },
  LIMOUSINE: {
    value: "LIMOUSINE" as CarType,
    label: "Xe Limousine",
    shortLabel: "Limousine",
    badgeClasses: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-800",
    },
  },
  SEAT: {
    value: "SEAT" as CarType,
    label: "Xe ghế ngồi",
    shortLabel: "Ghế ngồi",
    badgeClasses: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
    },
  },
} as const;

export const CAR_TYPE_OPTIONS: { value: CarType; label: string }[] = [
  { value: "SLEEPER", label: "Xe giường nằm (SLEEPER)" },
  { value: "LIMOUSINE", label: "Xe Limousine (LIMOUSINE)" },
  { value: "SEAT", label: "Xe ghế ngồi (SEAT)" },
];
