import { CarType } from '../value-object/car-type.enum';
import { CarStatus } from '../value-object/car-status.enum';
import { LicensePlate } from '../value-object/license-plate.vo';

export interface CarProps {
  id?: string;
  operatorId: string;
  name: string;
  type: CarType;
  status?: CarStatus;
  licensePlate: string | LicensePlate;
  totalSeats: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Car {
  private readonly _id?: string;
  private readonly _operatorId: string;
  private _name: string;
  private _type: CarType;
  private _status: CarStatus;
  private _licensePlate: LicensePlate;
  private _totalSeats: number;
  private readonly _createdAt?: Date;
  private _updatedAt?: Date;

  private constructor(props: CarProps) {
    this.validateName(props.name);
    this.validateTotalSeats(props.totalSeats);

    if (!props.operatorId || !props.operatorId.trim()) {
      throw new Error('Mã nhà xe (Operator ID) không được để trống.');
    }

    this._id = props.id;
    this._operatorId = props.operatorId;
    this._name = props.name.trim();
    this._type = props.type || CarType.SLEEPER;
    this._status = props.status || CarStatus.ACTIVE;
    this._licensePlate =
      props.licensePlate instanceof LicensePlate
        ? props.licensePlate
        : new LicensePlate(props.licensePlate);
    this._totalSeats = props.totalSeats;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public static create(props: CarProps): Car {
    return new Car(props);
  }

  public static reconstruct(props: Required<CarProps>): Car {
    return new Car(props);
  }

  private validateName(name: string): void {
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      throw new Error('Tên xe phải có độ dài từ 3 đến 100 ký tự.');
    }
  }

  private validateTotalSeats(seats: number): void {
    if (!Number.isInteger(seats) || seats <= 0) {
      throw new Error('Tổng số ghế phải là số nguyên dương lớn hơn 0.');
    }
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get operatorId(): string {
    return this._operatorId;
  }

  get name(): string {
    return this._name;
  }

  get type(): CarType {
    return this._type;
  }

  get status(): CarStatus {
    return this._status;
  }

  get licensePlate(): LicensePlate {
    return this._licensePlate;
  }

  get totalSeats(): number {
    return this._totalSeats;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  public updateInfo(
    name?: string,
    type?: CarType,
    licensePlate?: string,
  ): void {
    if (name !== undefined) {
      this.validateName(name);
      this._name = name.trim();
    }
    if (type !== undefined) {
      this._type = type;
    }
    if (licensePlate !== undefined) {
      this._licensePlate = new LicensePlate(licensePlate);
    }
    this._updatedAt = new Date();
  }

  public changeStatus(newStatus: CarStatus): void {
    this._status = newStatus;
    this._updatedAt = new Date();
  }
}
