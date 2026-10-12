export interface OperatorStopProps {
  id?: string;
  operatorId: string;
  name: string;
  address: string;
  province: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OperatorStop {
  private readonly _id?: string;
  private readonly _operatorId: string;
  private _name: string;
  private _address: string;
  private _province: string;
  private _active: boolean;
  private readonly _createdAt?: Date;
  private _updatedAt?: Date;

  constructor(props: OperatorStopProps) {
    if (!props.operatorId || !props.operatorId.trim()) {
      throw new Error('Mã nhà xe không được để trống.');
    }
    if (!props.name || props.name.trim().length < 2) {
      throw new Error('Tên điểm dừng phải có tối thiểu 2 ký tự.');
    }
    if (!props.address || props.address.trim().length < 2) {
      throw new Error('Địa chỉ điểm dừng phải có tối thiểu 2 ký tự.');
    }
    if (!props.province || props.province.trim().length < 2) {
      throw new Error('Tỉnh/thành phố phải có tối thiểu 2 ký tự.');
    }

    this._id = props.id;
    this._operatorId = props.operatorId;
    this._name = props.name.trim();
    this._address = props.address.trim();
    this._province = props.province.trim();
    this._active = props.active !== undefined ? props.active : true;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string | undefined {
    return this._id;
  }
  get operatorId(): string {
    return this._operatorId;
  }
  get name(): string {
    return this._name;
  }
  get address(): string {
    return this._address;
  }
  get province(): string {
    return this._province;
  }
  get active(): boolean {
    return this._active;
  }
  get createdAt(): Date | undefined {
    return this._createdAt;
  }
  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  update(name?: string, address?: string, province?: string): void {
    if (name !== undefined) {
      if (name.trim().length < 2)
        throw new Error('Tên điểm dừng phải có tối thiểu 2 ký tự.');
      this._name = name.trim();
    }
    if (address !== undefined) {
      if (address.trim().length < 2)
        throw new Error('Địa chỉ điểm dừng phải có tối thiểu 2 ký tự.');
      this._address = address.trim();
    }
    if (province !== undefined) {
      if (province.trim().length < 2)
        throw new Error('Tỉnh/thành phố phải có tối thiểu 2 ký tự.');
      this._province = province.trim();
    }
    this._updatedAt = new Date();
  }

  archive(): void {
    this._active = false;
    this._updatedAt = new Date();
  }
}
