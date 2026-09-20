export interface RouteStopProps {
  id?: string;
  routeId?: string;
  name: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RouteStop {
  private readonly _id?: string;
  private _routeId?: string;
  private _name: string;
  private _order: number;
  private readonly _createdAt?: Date;
  private _updatedAt?: Date;

  private constructor(props: RouteStopProps) {
    this.validateName(props.name);
    this.validateOrder(props.order);

    this._id = props.id;
    this._routeId = props.routeId;
    this._name = props.name.trim();
    this._order = props.order;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public static create(props: RouteStopProps): RouteStop {
    return new RouteStop(props);
  }

  public static reconstruct(props: Required<RouteStopProps>): RouteStop {
    return new RouteStop(props);
  }

  private validateName(name: string): void {
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      throw new Error('Tên điểm dừng phải có độ dài từ 3 đến 100 ký tự.');
    }
  }

  private validateOrder(order: number): void {
    if (!Number.isInteger(order) || order < 0) {
      throw new Error('Thứ tự điểm dừng phải là số nguyên không âm (>= 0).');
    }
  }

  get id(): string | undefined {
    return this._id;
  }

  get routeId(): string | undefined {
    return this._routeId;
  }

  get name(): string {
    return this._name;
  }

  get order(): number {
    return this._order;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
