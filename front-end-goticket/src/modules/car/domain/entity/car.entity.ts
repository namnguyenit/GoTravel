import { type CarType, CAR_TYPE_CONFIG } from "../value-object/car-type.vo";
import {
  type CarStatus,
  CAR_STATUS_CONFIG,
} from "../value-object/car-status.vo";

export interface CarProps {
  id: string;
  operatorId: string;
  name: string;
  type: CarType;
  status: CarStatus;
  licensePlate: string;
  totalSeats: number;
  createdAt: string;
  updatedAt: string;
}

export class CarEntity {
  private readonly props: CarProps;

  constructor(props: CarProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get operatorId(): string {
    return this.props.operatorId;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): CarType {
    return this.props.type;
  }

  get status(): CarStatus {
    return this.props.status;
  }

  get licensePlate(): string {
    return this.props.licensePlate;
  }

  get totalSeats(): number {
    return this.props.totalSeats;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get updatedAt(): string {
    return this.props.updatedAt;
  }

  public getTypeDisplayName(): string {
    return CAR_TYPE_CONFIG[this.props.type]?.label || this.props.type;
  }

  public getTypeShortLabel(): string {
    return CAR_TYPE_CONFIG[this.props.type]?.shortLabel || this.props.type;
  }

  public getTypeBadgeClasses(): {
    border: string;
    bg: string;
    text: string;
  } {
    return (
      CAR_TYPE_CONFIG[this.props.type]?.badgeClasses || {
        border: "border-gray-200",
        bg: "bg-gray-50",
        text: "text-gray-700",
      }
    );
  }

  public getStatusDisplayName(): string {
    return CAR_STATUS_CONFIG[this.props.status]?.label || this.props.status;
  }

  public getStatusBadgeClasses(): {
    border: string;
    bg: string;
    text: string;
  } {
    return (
      CAR_STATUS_CONFIG[this.props.status]?.badgeClasses || {
        border: "border-gray-200",
        bg: "bg-gray-50",
        text: "text-gray-700",
      }
    );
  }

  public getFormattedCreatedAt(): string {
    if (!this.props.createdAt) return "";
    try {
      const date = new Date(this.props.createdAt);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return this.props.createdAt;
    }
  }

  public getFormattedUpdatedAt(): string {
    if (!this.props.updatedAt) return "";
    try {
      const date = new Date(this.props.updatedAt);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return this.props.updatedAt;
    }
  }

  public static fromApiResponse(raw: any): CarEntity {
    return new CarEntity({
      id: raw.id || "",
      operatorId: raw.operatorId || "",
      name: raw.name || "",
      type: (raw.type as CarType) || "SLEEPER",
      status: (raw.status as CarStatus) || "ACTIVE",
      licensePlate: raw.licensePlate || "",
      totalSeats: Number(raw.totalSeats) || 0,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    });
  }
}
