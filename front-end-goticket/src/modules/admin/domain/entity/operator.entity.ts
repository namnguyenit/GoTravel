export interface OperatorProps {
  id: string;
  userId: string;
  name: string;
  status?: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export class OperatorEntity {
  private readonly props: OperatorProps;

  constructor(props: OperatorProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): "ACTIVE" | "SUSPENDED" {
    return this.props.status || "ACTIVE";
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
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
}
