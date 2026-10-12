import React from "react";
import type { CarType } from "../../domain/value-object/car-type.vo";
import { CAR_TYPE_CONFIG } from "../../domain/value-object/car-type.vo";
import { Badge } from "@/components/ui/badge";

interface CarTypeBadgeProps {
  type: CarType;
  className?: string;
  showShortLabel?: boolean;
}

export const CarTypeBadge: React.FC<CarTypeBadgeProps> = ({
  type,
  className = "",
  showShortLabel = false,
}) => {
  const config = CAR_TYPE_CONFIG[type] || {
    label: type,
    shortLabel: type,
    badgeClasses: {
      border: "border-gray-200",
      bg: "bg-gray-50",
      text: "text-gray-700",
    },
  };

  const label = showShortLabel ? config.shortLabel : config.label;

  return (
    <Badge
      variant="outline"
      className={`border font-medium ${config.badgeClasses.border} ${config.badgeClasses.bg} ${config.badgeClasses.text} ${className}`}
    >
      {label}
    </Badge>
  );
};
