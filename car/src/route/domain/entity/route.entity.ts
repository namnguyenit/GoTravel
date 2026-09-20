import { RouteStop } from './route-stop.entity';
import { RouteStatus } from '../value-object/route-status.enum';

export interface RouteProps {
  id?: string;
  operatorId: string;
  origin: string;
  destination: string;
  status?: RouteStatus;
  stops?: RouteStop[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Route {
  private readonly _id?: string;
  private readonly _operatorId: string;
  private _origin: string;
  private _destination: string;
  private _status: RouteStatus;
  private _stops: RouteStop[];
  private readonly _createdAt?: Date;
  private _updatedAt?: Date;

  private constructor(props: RouteProps) {
    this.validateOperatorId(props.operatorId);
    this.validateOrigin(props.origin);
    this.validateDestination(props.destination);
    this.validateOriginAndDestination(props.origin, props.destination);

    const stops = props.stops || [];
    this.validateStops(stops);

    this._id = props.id;
    this._operatorId = props.operatorId;
    this._origin = props.origin.trim();
    this._destination = props.destination.trim();
    this._status = props.status || RouteStatus.ACTIVE;
    this._stops = stops;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public static create(props: RouteProps): Route {
    return new Route(props);
  }

  public static reconstruct(props: Required<RouteProps>): Route {
    return new Route(props);
  }

  private validateOperatorId(operatorId: string): void {
    if (!operatorId || operatorId.trim().length === 0) {
      throw new Error('Operator ID không được để trống.');
    }
  }

  private validateOrigin(origin: string): void {
    if (!origin || origin.trim().length < 2 || origin.trim().length > 100) {
      throw new Error('Điểm đi (origin) phải có độ dài từ 2 đến 100 ký tự.');
    }
  }

  private validateDestination(destination: string): void {
    if (!destination || destination.trim().length < 2 || destination.trim().length > 100) {
      throw new Error('Điểm đến (destination) phải có độ dài từ 2 đến 100 ký tự.');
    }
  }

  private validateOriginAndDestination(origin: string, destination: string): void {
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      throw new Error('Điểm xuất phát và điểm đến không được trùng nhau.');
    }
  }

  private validateStops(stops: RouteStop[]): void {
    if (!stops || stops.length < 2) {
      throw new Error('Tuyến đường phải có ít nhất 2 điểm dừng (gồm điểm đầu và điểm cuối).');
    }

    const orders = new Set<number>();
    for (const stop of stops) {
      if (orders.has(stop.order)) {
        throw new Error(`Thứ tự điểm dừng (order: ${stop.order}) bị trùng lặp.`);
      }
      orders.add(stop.order);
    }
  }

  get id(): string | undefined {
    return this._id;
  }

  get operatorId(): string {
    return this._operatorId;
  }

  get origin(): string {
    return this._origin;
  }

  get destination(): string {
    return this._destination;
  }

  get status(): RouteStatus {
    return this._status;
  }

  get stops(): RouteStop[] {
    return [...this._stops];
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  public changeStatus(newStatus: RouteStatus): void {
    if (this._status === newStatus) {
      if (newStatus === RouteStatus.INACTIVE) {
        throw new Error('Tuyến đường này hiện đã bị khóa trước đó.');
      } else {
        throw new Error('Tuyến đường này hiện đang hoạt động.');
      }
    }
    this._status = newStatus;
    this._updatedAt = new Date();
  }
}
