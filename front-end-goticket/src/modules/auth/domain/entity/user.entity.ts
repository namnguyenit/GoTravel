export interface UserProps {
  id: string;
  username?: string;
  email: string;
  fullName: string;
  role: string;
  roles?: string[];
}

export class UserEntity {
  private readonly props: UserProps;

  constructor(props: UserProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }
  get username(): string | undefined {
    return this.props.username;
  }
  get email(): string {
    return this.props.email;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get role(): string {
    return this.props.role;
  }
  get roles(): string[] {
    return this.props.roles || (this.props.role ? [this.props.role] : []);
  }

  public getDisplayName(): string {
    return (
      this.props.fullName ||
      this.props.username ||
      this.props.email ||
      "Tài khoản"
    );
  }

  public isAdmin(): boolean {
    const list = this.roles.map((r) => r.toUpperCase());
    return list.some((r) => r.includes("ADMIN"));
  }

  public isOperator(): boolean {
    if (this.isAdmin()) return false;
    const list = this.roles.map((r) => r.toUpperCase());
    return list.some((r) => r.includes("OPERATOR") || r.includes("HOST"));
  }
}
