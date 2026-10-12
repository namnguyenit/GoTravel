import {
  type TripStatus,
  TRIP_STATUS,
  TripStatusVO,
} from "../value-object/trip-status.vo";
import { TripTimeVO } from "../value-object/trip-time.vo";
import { TripPriceVO } from "../value-object/trip-price.vo";

export interface TripRouteInfo {
  id: string;
  origin: string;
  destination: string;
}

export interface TripCarInfo {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  totalSeats: number;
}

export interface TripOccupancyInfo {
  bookedSeats: number;
  availableSeats: number;
  occupancyRate: number;
}

export interface TripProps {
  id: string;
  operatorId: string;
  routeId: string;
  carId: string;
  departureTime: string;
  arrivalTime: string;
  pricePerSeat: number;
  status: TripStatus;
  route?: TripRouteInfo;
  car?: TripCarInfo;
  occupancy?: TripOccupancyInfo;
  createdAt: string;
  updatedAt: string;
}

export class TripEntity {
  private readonly props: TripProps;

  constructor(props: TripProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get operatorId(): string {
    return this.props.operatorId;
  }

  get routeId(): string {
    return this.props.routeId;
  }

  get carId(): string {
    return this.props.carId;
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

  get route(): TripRouteInfo | undefined {
    return this.props.route;
  }

  get car(): TripCarInfo | undefined {
    return this.props.car;
  }

  get occupancy(): TripOccupancyInfo | undefined {
    return this.props.occupancy;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get updatedAt(): string {
    return this.props.updatedAt;
  }

  public isScheduled(): boolean {
    return this.props.status === TRIP_STATUS.SCHEDULED;
  }

  public isDeparted(): boolean {
    return this.props.status === TRIP_STATUS.DEPARTED;
  }

  public isCompleted(): boolean {
    return this.props.status === TRIP_STATUS.COMPLETED;
  }

  public isCancelled(): boolean {
    return this.props.status === TRIP_STATUS.CANCELLED;
  }

  public canDepart(): boolean {
    return this.props.status === TRIP_STATUS.SCHEDULED;
  }

  public canComplete(): boolean {
    return this.props.status === TRIP_STATUS.DEPARTED;
  }

  public canCancel(): boolean {
    return this.props.status === TRIP_STATUS.SCHEDULED;
  }

  public isTerminal(): boolean {
    return (
      this.props.status === TRIP_STATUS.COMPLETED ||
      this.props.status === TRIP_STATUS.CANCELLED
    );
  }

  public changeStatus(newStatus: TripStatus): void {
    const check = TripStatusVO.canTransition(this.props.status, newStatus);
    if (!check.allowed) {
      throw new Error(check.reason || "Chuyển đổi trạng thái không hợp lệ.");
    }
    this.props.status = newStatus;
  }

  public getSummaryRoute(): string {
    if (this.props.route?.origin && this.props.route?.destination) {
      return `${this.props.route.origin} ➔ ${this.props.route.destination}`;
    }
    return `Tuyến: ${this.props.routeId}`;
  }

  public getFormattedDepartureTime(): string {
    return TripTimeVO.formatDateTime(this.props.departureTime);
  }

  public getFormattedArrivalTime(): string {
    return TripTimeVO.formatDateTime(this.props.arrivalTime);
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

  public getOccupancyText(): string {
    const booked = this.props.occupancy?.bookedSeats ?? 0;
    const total =
      this.props.car?.totalSeats ??
      booked + (this.props.occupancy?.availableSeats ?? 0);
    return `${booked}/${total} ghế`;
  }

  public getOccupancyRate(): number {
    return this.props.occupancy?.occupancyRate ?? 0;
  }

  public getStatusDisplayName(): string {
    return TripStatusVO.getLabel(this.props.status);
  }

  public getStatusBadgeClasses(): string {
    return TripStatusVO.getBadgeClasses(this.props.status);
  }

  public static fromApiResponse(raw: any): TripEntity {
    return new TripEntity({
      id: raw.id || "",
      operatorId: raw.operatorId || "",
      routeId: raw.routeId || raw.route?.id || "",
      carId: raw.carId || raw.car?.id || "",
      departureTime: raw.departureTime || "",
      arrivalTime: raw.arrivalTime || "",
      pricePerSeat: Number(raw.pricePerSeat) || 0,
      status: (raw.status as TripStatus) || TRIP_STATUS.SCHEDULED,
      route: raw.route
        ? {
            id: raw.route.id || "",
            origin: raw.route.origin || "",
            destination: raw.route.destination || "",
          }
        : undefined,
      car: raw.car
        ? {
            id: raw.car.id || "",
            name: raw.car.name || "",
            licensePlate: raw.car.licensePlate || "",
            type: raw.car.type || "",
            totalSeats: Number(raw.car.totalSeats) || 0,
          }
        : undefined,
      occupancy: raw.occupancy
        ? {
            bookedSeats: Number(raw.occupancy.bookedSeats) || 0,
            availableSeats: Number(raw.occupancy.availableSeats) || 0,
            occupancyRate: Number(raw.occupancy.occupancyRate) || 0,
          }
        : undefined,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    });
  }
}
