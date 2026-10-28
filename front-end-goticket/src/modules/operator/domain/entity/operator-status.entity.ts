export interface OperatorDataProps {
  id: string;
  userId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperatorStatusProps {
  isOperator: boolean;
  operator?: OperatorDataProps;
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

  public getOperatorName(): string {
    return (
      this.props.operator?.name ||
      "Nhà xe"
    );
  }
}
