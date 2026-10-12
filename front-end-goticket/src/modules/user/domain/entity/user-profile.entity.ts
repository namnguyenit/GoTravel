export interface UserProfileProps {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  role: string;
  avatarUrl?: string;
  createdAt?: string;
}

export class UserProfileEntity {
  private readonly props: UserProfileProps;

  constructor(props: UserProfileProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }
  get username(): string {
    return this.props.username;
  }
  get email(): string {
    return this.props.email;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get phoneNumber(): string | undefined {
    return this.props.phoneNumber;
  }
  get address(): string | undefined {
    return this.props.address;
  }
  get role(): string {
    return this.props.role;
  }
  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }
  get createdAt(): string | undefined {
    return this.props.createdAt;
  }

  public getDisplayName(): string {
    return (
      this.props.fullName ||
      this.props.username ||
      this.props.email ||
      "Người dùng"
    );
  }

  public getMaskedEmail(): string {
    if (!this.props.email || !this.props.email.includes("@"))
      return this.props.email;
    const [name, domain] = this.props.email.split("@");
    if (name.length <= 2) return name + "***@" + domain;
    return name.substring(0, 2) + "***@" + domain;
  }

  public isAdmin(): boolean {
    return this.props.role === "ADMIN";
  }

  public isOperator(): boolean {
    if (this.isAdmin()) return false;
    return this.props.role === "OPERATOR" || this.props.role === "HOST";
  }
}
