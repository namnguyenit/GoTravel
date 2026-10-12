export interface OperatorProps {
  id?: string;
  userId: string;
  name: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  createdAt?: Date;
  updatedAt?: Date;
}

export class Operator {
  private readonly _id?: string;
  private readonly _userId: string;
  private _name: string;
  private readonly _status: 'ACTIVE' | 'SUSPENDED';
  private readonly _createdAt?: Date;
  private _updatedAt?: Date;

  private constructor(props: OperatorProps) {
    this.validateUserId(props.userId);
    this.validateName(props.name);

    this._id = props.id;
    this._userId = props.userId.trim();
    this._name = props.name.trim();
    this._status = props.status || 'ACTIVE';
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public static create(props: OperatorProps): Operator {
    return new Operator(props);
  }

  public static reconstruct(props: Required<OperatorProps>): Operator {
    return new Operator(props);
  }

  private validateUserId(userId: string): void {
    if (!userId || !userId.trim()) {
      throw new Error('Mã người dùng (userId) không được để trống.');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      throw new Error('Tên nhà xe phải có độ dài từ 3 đến 100 ký tự.');
    }
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get name(): string {
    return this._name;
  }

  get status(): 'ACTIVE' | 'SUSPENDED' {
    return this._status;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
