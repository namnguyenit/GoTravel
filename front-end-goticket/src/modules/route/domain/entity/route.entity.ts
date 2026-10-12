import {
  type RouteStatus,
  RouteStatusVO,
  ROUTE_STATUS,
} from "../value-object/route-status.vo";

export interface RouteStopProps {
  id: string;
  routeId?: string;
  name: string;
  order: number;
  createdAt?: string;
}

export class RouteStopEntity {
  private readonly props: RouteStopProps;

  constructor(props: RouteStopProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get routeId(): string | undefined {
    return this.props.routeId;
  }

  get name(): string {
    return this.props.name;
  }

  get order(): number {
    return this.props.order;
  }

  get createdAt(): string | undefined {
    return this.props.createdAt;
  }

  public static fromApiResponse(raw: any): RouteStopEntity {
    return new RouteStopEntity({
      id: raw.id || "",
      routeId: raw.routeId,
      name: raw.name || "",
      order: Number(raw.order) || 0,
      createdAt: raw.createdAt,
    });
  }
}

export interface RouteProps {
  id: string;
  operatorId: string;
  origin: string;
  destination: string;
  status: RouteStatus;
  stops: RouteStopEntity[];
  createdAt: string;
  updatedAt: string;
}

export class RouteEntity {
  private readonly props: RouteProps;

  constructor(props: RouteProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get operatorId(): string {
    return this.props.operatorId;
  }

  get origin(): string {
    return this.props.origin;
  }

  get destination(): string {
    return this.props.destination;
  }

  get status(): RouteStatus {
    return this.props.status;
  }

  public isActive(): boolean {
    return this.props.status === ROUTE_STATUS.ACTIVE;
  }

  public isInactive(): boolean {
    return this.props.status === ROUTE_STATUS.INACTIVE;
  }

  public getStatusDisplayName(): string {
    return RouteStatusVO.getLabel(this.props.status);
  }

  public getStatusBadgeClasses(): string {
    return RouteStatusVO.getBadgeClasses(this.props.status);
  }

  get stops(): RouteStopEntity[] {
    return this.props.stops;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get updatedAt(): string {
    return this.props.updatedAt;
  }

  public getTotalStops(): number {
    return this.props.stops.length;
  }

  public getStopsSorted(): RouteStopEntity[] {
    return [...this.props.stops].sort((a, b) => a.order - b.order);
  }

  public getStartStop(): RouteStopEntity | undefined {
    const sorted = this.getStopsSorted();
    return sorted[0];
  }

  public getEndStop(): RouteStopEntity | undefined {
    const sorted = this.getStopsSorted();
    return sorted.length > 1 ? sorted[sorted.length - 1] : undefined;
  }

  public getIntermediateStops(): RouteStopEntity[] {
    const sorted = this.getStopsSorted();
    if (sorted.length <= 2) return [];
    return sorted.slice(1, -1);
  }

  public getSummaryRoute(): string {
    return `${this.props.origin} ➔ ${this.props.destination}`;
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

  public static fromApiResponse(raw: any): RouteEntity {
    const rawStops = Array.isArray(raw.stops) ? raw.stops : [];
    const stopEntities = rawStops.map((s: any) =>
      RouteStopEntity.fromApiResponse(s)
    );

    return new RouteEntity({
      id: raw.id || "",
      operatorId: raw.operatorId || "",
      origin: raw.origin || "",
      destination: raw.destination || "",
      status: (raw.status as RouteStatus) || ROUTE_STATUS.ACTIVE,
      stops: stopEntities,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    });
  }
}
