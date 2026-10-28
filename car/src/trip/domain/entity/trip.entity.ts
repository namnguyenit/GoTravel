import { TripStatus } from '../value-object/trip-status.enum';

export interface TripProps {
  id?: string;
  operatorId: string;
  routeId: string;
  carId: string;
  departureTime: Date;
  arrivalTime: Date;
  pricePerSeat: number;
  priceVnd?: string;
  status?: TripStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Trip {
  private readonly _id?: string;
  private readonly _operatorId: string;
  private readonly _routeId: string;
  private readonly _carId: string;
  private _departureTime: Date;
  private _arrivalTime: Date;
  private _pricePerSeat: number;
  private readonly _priceVnd: string;
  private _status: TripStatus;
  private readonly _createdAt?: Date;
  private _updatedAt?: Date;

  private constructor(props: TripProps) {
    this.validateOperatorId(props.operatorId);
    this.validateRouteId(props.routeId);
    this.validateCarId(props.carId);
    this.validateTimes(props.departureTime, props.arrivalTime);
    if (props.priceVnd !== undefined) {
      if (
        !/^[1-9]\d{0,17}$/.test(props.priceVnd) ||
        !Number.isFinite(props.pricePerSeat) ||
        props.pricePerSeat <= 0
      )
        throw new Error('Giá VND không hợp lệ');
    } else this.validatePricePerSeat(props.pricePerSeat);

    this._id = props.id;
    this._operatorId = props.operatorId;
    this._routeId = props.routeId;
    this._carId = props.carId;
    this._departureTime = props.departureTime;
    this._arrivalTime = props.arrivalTime;
    this._pricePerSeat = props.pricePerSeat;
    this._priceVnd = props.priceVnd ?? String(props.pricePerSeat);
    this._status = props.status || TripStatus.DRAFT;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public static create(props: TripProps): Trip {
    return new Trip(props);
  }

  public static reconstruct(
    props: Required<Omit<TripProps, 'priceVnd'>> & Pick<TripProps, 'priceVnd'>,
  ): Trip {
    return new Trip(props);
  }

  private validateOperatorId(operatorId: string): void {
    if (!operatorId || operatorId.trim().length === 0) {
      throw new Error('Operator ID không được để trống.');
    }
  }

  private validateRouteId(routeId: string): void {
    if (!routeId || routeId.trim().length === 0) {
      throw new Error('Route ID không được để trống.');
    }
  }

  private validateCarId(carId: string): void {
    if (!carId || carId.trim().length === 0) {
      throw new Error('Car ID không được để trống.');
    }
  }

  private validateTimes(departureTime: Date, arrivalTime: Date): void {
    if (
      !departureTime ||
      !(departureTime instanceof Date) ||
      isNaN(departureTime.getTime())
    ) {
      throw new Error('Thời gian xuất bến không hợp lệ.');
    }

    if (
      !arrivalTime ||
      !(arrivalTime instanceof Date) ||
      isNaN(arrivalTime.getTime())
    ) {
      throw new Error('Thời gian đến dự kiến không hợp lệ.');
    }

    if (arrivalTime.getTime() <= departureTime.getTime()) {
      throw new Error('Thời gian đến dự kiến phải sau thời gian xuất bến.');
    }
  }

  private validatePricePerSeat(pricePerSeat: number): void {
    if (!Number.isSafeInteger(pricePerSeat) || pricePerSeat <= 0) {
      throw new Error('Giá vé cơ bản trên mỗi ghế phải lớn hơn 0 VNĐ.');
    }
  }

  get priceVnd(): string {
    return this._priceVnd;
  }

  public depart(): void {
    if (this._status === TripStatus.DEPARTED) {
      throw new Error('Chuyến xe hiện đã ở trạng thái DEPARTED trước đó.');
    }
    if (
      this._status !== TripStatus.ON_SALE &&
      this._status !== TripStatus.STOP_SALE
    ) {
      throw new Error(
        'Chỉ chuyến đã mở bán hoặc ngừng bán mới có thể xuất bến.',
      );
    }
    if (this._departureTime > new Date()) {
      throw new Error('Chuyến chưa đến giờ khởi hành.');
    }
    this._status = TripStatus.DEPARTED;
    this._updatedAt = new Date();
  }

  public complete(): void {
    if (this._status === TripStatus.COMPLETED) {
      throw new Error('Chuyến xe hiện đã ở trạng thái COMPLETED trước đó.');
    }
    if (![TripStatus.DEPARTED, TripStatus.ON_SALE, TripStatus.STOP_SALE, TripStatus.SCHEDULED].includes(this._status)) {
      throw new Error(
        'Chỉ chuyến đã được lên lịch/mở bán mới có thể hoàn thành.',
      );
    }
    if (this._arrivalTime > new Date())
      throw new Error('Chuyến chưa đến giờ kết thúc dự kiến.');
    this._status = TripStatus.COMPLETED;
    this._updatedAt = new Date();
  }

  public cancel(): void {
    if (this._status === TripStatus.CANCELLED) {
      throw new Error('Chuyến xe hiện đã ở trạng thái CANCELLED trước đó.');
    }
    if (this._status === TripStatus.DEPARTED) {
      throw new Error(
        'Chuyến xe đã xuất bến và đang trong hành trình di chuyển, không thể hủy chuyến.',
      );
    }
    if (this._status === TripStatus.COMPLETED) {
      throw new Error(
        'Chuyến xe đã hoàn thành hành trình, không thể hủy chuyến.',
      );
    }
    if (this._status !== TripStatus.DRAFT) {
      throw new Error(
        'Hủy chuyến đã công bố cần đi qua quy trình hủy vé và hoàn tiền.',
      );
    }
    this._status = TripStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  public changeStatus(newStatus: TripStatus): void {
    if (newStatus === this._status) {
      throw new Error(`Chuyến xe hiện đã ở trạng thái ${newStatus} trước đó.`);
    }

    switch (newStatus) {
      case TripStatus.DEPARTED:
        this.depart();
        break;
      case TripStatus.COMPLETED:
        this.complete();
        break;
      case TripStatus.CANCELLED:
        this.cancel();
        break;
      default:
        throw new Error(
          `Không thể chuyển trạng thái chuyến xe về ${newStatus}.`,
        );
    }
  }

  get id(): string | undefined {
    return this._id;
  }

  get operatorId(): string {
    return this._operatorId;
  }

  get routeId(): string {
    return this._routeId;
  }

  get carId(): string {
    return this._carId;
  }

  get departureTime(): Date {
    return this._departureTime;
  }

  get arrivalTime(): Date {
    return this._arrivalTime;
  }

  get pricePerSeat(): number {
    return this._pricePerSeat;
  }

  get status(): TripStatus {
    return this._status;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
