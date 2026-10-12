export interface OperatorDataProps {
  id: string;
  userId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperatorApplicationProps {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperatorStatusProps {
  isOperator: boolean;
  operator?: OperatorDataProps;
  latestApplication?: OperatorApplicationProps;
}

export class OperatorStatusEntity {
  private readonly props: OperatorStatusProps;

  constructor(props: OperatorStatusProps) {
    this.props = props;
  }

  get isOperator(): boolean {
    return this.props.isOperator;
  }
  get operator(): OperatorDataProps | undefined {
    return this.props.operator;
  }
  get latestApplication(): OperatorApplicationProps | undefined {
    return this.props.latestApplication;
  }

  public canAccessOperatorPortal(): boolean {
    return this.props.isOperator === true;
  }

  public hasPendingApplication(): boolean {
    return (
      !this.props.isOperator &&
      this.props.latestApplication?.status === "PENDING"
    );
  }

  public hasRejectedApplication(): boolean {
    return (
      !this.props.isOperator &&
      this.props.latestApplication?.status === "REJECTED"
    );
  }

  public getRejectReason(): string | null {
    return this.props.latestApplication?.rejectReason || null;
  }

  public getOperatorName(): string {
    return (
      this.props.operator?.name ||
      this.props.latestApplication?.name ||
      "Nhà xe"
    );
  }
}
