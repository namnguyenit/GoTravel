import { type TripStatus, TripStatusVO } from "../value-object/trip-status.vo";
import { TripTimeVO } from "../value-object/trip-time.vo";
import { TripPriceVO } from "../value-object/trip-price.vo";
import { RouteStopEntity } from "@/modules/route/domain/entity/route.entity";

export interface CustomerTripOperatorInfo {
  id: string;
  name: string;
}

export interface CustomerTripRouteStopInfo {
  id: string;
  name: string;
  order: number;
}

export interface CustomerTripRouteInfo {
  id: string;
  origin: string;
  destination: string;
  stops: CustomerTripRouteStopInfo[];
}

export interface CustomerTripCarInfo {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  totalSeats: number;
}

export interface CustomerTripSeatsInfo {
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  isSoldOut: boolean;
}

export interface CustomerTripProps {
  id: string;
  departureTime: string;
  arrivalTime: string;
  pricePerSeat: number;
  status: TripStatus;
  operator: CustomerTripOperatorInfo;
  route: CustomerTripRouteInfo;
  car: CustomerTripCarInfo;
  seats: CustomerTripSeatsInfo;
}

export class CustomerTripEntity {
  private readonly props: CustomerTripProps;

  constructor(props: CustomerTripProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get departureTime(): string {
    return this.props.departureTime;
  }

  get arrivalTime(): string {
    return this.props.arrivalTime;
  }

  get pricePerSeat(): number {
    return this.props.pricePerSeat;
  }

  get status(): TripStatus {
    return this.props.status;
  }

  get operator(): CustomerTripOperatorInfo {
    return this.props.operator;
  }

  get route(): CustomerTripRouteInfo {
    return this.props.route;
  }

  get car(): CustomerTripCarInfo {
    return this.props.car;
  }

  get seats(): CustomerTripSeatsInfo {
    return this.props.seats;
  }

  public getSummaryRoute(): string {
    return `${this.props.route.origin} ➔ ${this.props.route.destination}`;
  }

  public getFormattedDepartureTime(): string {
    return TripTimeVO.formatDateTime(this.props.departureTime);
  }

  public getFormattedArrivalTime(): string {
    return TripTimeVO.formatDateTime(this.props.arrivalTime);
  }

  public getDepartureTimeOnly(): string {
    return TripTimeVO.formatTime(this.props.departureTime);
  }

  public getArrivalTimeOnly(): string {
    return TripTimeVO.formatTime(this.props.arrivalTime);
  }

  public getDepartureDateOnly(): string {
    return TripTimeVO.formatDate(this.props.departureTime);
  }

  public getDurationText(): string {
    return TripTimeVO.formatDuration(
      this.props.departureTime,
      this.props.arrivalTime
    );
  }

  public getFormattedPrice(): string {
    return TripPriceVO.formatVND(this.props.pricePerSeat);
  }

  public isSoldOut(): boolean {
    return this.props.seats.isSoldOut || this.props.seats.availableSeats <= 0;
  }

  public getAvailableSeats(): number {
    return Math.max(0, this.props.seats.availableSeats);
  }

  public getAvailableSeatsText(): string {
    if (this.isSoldOut()) {
      return "Hết vé";
    }
    return `Còn ${this.props.seats.availableSeats} chỗ`;
  }

  public getStartStopName(): string {
    if (this.props.route.stops && this.props.route.stops.length > 0) {
      const sorted = [...this.props.route.stops].sort(
        (a, b) => a.order - b.order
      );
      return sorted[0].name;
    }
    return this.props.route.origin;
  }

  public getEndStopName(): string {
    if (this.props.route.stops && this.props.route.stops.length > 0) {
      const sorted = [...this.props.route.stops].sort(
        (a, b) => a.order - b.order
      );
      return sorted[sorted.length - 1].name;
    }
    return this.props.route.destination;
  }

  public getStopsAsEntities(): RouteStopEntity[] {
    return (this.props.route.stops || []).map(
      (s) =>
        new RouteStopEntity({
          id: s.id,
          name: s.name,
          order: s.order,
        })
    );
  }

  public getCarTypeLabel(): string {
    switch (this.props.car.type) {
      case "LIMOUSINE":
        return "Limousine VIP";
      case "SLEEPER":
        return "Giường nằm";
      case "SEAT":
        return "Ghế ngồi";
      default:
        return this.props.car.type || "Xe khách";
    }
  }

  public getCarTypeBadgeClasses(): string {
    switch (this.props.car.type) {
      case "LIMOUSINE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SLEEPER":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "SEAT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  }

  public getStatusDisplayName(): string {
    return TripStatusVO.getLabel(this.props.status);
  }

  public static fromApiResponse(raw: any): CustomerTripEntity {
    return new CustomerTripEntity({
      id: raw.id || "",
      departureTime: raw.departureTime || "",
      arrivalTime: raw.arrivalTime || "",
      pricePerSeat: Number(raw.pricePerSeat) || 0,
      status: raw.status || "SCHEDULED",
      operator: {
        id: raw.operator?.id || "",
        name: raw.operator?.name || "Nhà xe GoStay",
      },
      route: {
        id: raw.route?.id || "",
        origin: raw.route?.origin || "",
        destination: raw.route?.destination || "",
        stops: Array.isArray(raw.route?.stops)
          ? raw.route.stops.map((s: any) => ({
              id: s.id || "",
              name: s.name || "",
              order: Number(s.order) || 0,
            }))
          : [],
      },
      car: {
        id: raw.car?.id || "",
        name: raw.car?.name || "",
        licensePlate: raw.car?.licensePlate || "",
        type: raw.car?.type || "SLEEPER",
        totalSeats: Number(raw.car?.totalSeats) || 0,
      },
      seats: {
        totalSeats:
          Number(raw.seats?.totalSeats) || Number(raw.car?.totalSeats) || 0,
        bookedSeats: Number(raw.seats?.bookedSeats) || 0,
        availableSeats: Number(raw.seats?.availableSeats) || 0,
        isSoldOut: Boolean(raw.seats?.isSoldOut),
      },
    });
  }
}
