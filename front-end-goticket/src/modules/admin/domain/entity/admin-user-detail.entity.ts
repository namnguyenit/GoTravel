export interface AdminUserDetailProps {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  roles: string[];
  isActive: boolean;
  isDeleted?: boolean;
  provider?: string;
}

export class AdminUserDetailEntity {
  private readonly props: AdminUserDetailProps;

  constructor(props: AdminUserDetailProps) {
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

  get fullName(): string | undefined {
    return this.props.fullName;
  }

  get phoneNumber(): string | undefined {
    return this.props.phoneNumber;
  }

  get address(): string | undefined {
    return this.props.address;
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  get roles(): string[] {
    return this.props.roles;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isDeleted(): boolean {
    return Boolean(this.props.isDeleted);
  }

  get provider(): string | undefined {
    return this.props.provider;
  }

  public getDisplayName(): string {
    return (
      this.props.fullName ||
      this.props.username ||
      this.props.email ||
      "Người dùng"
    );
  }

  public getInitials(): string {
    const name = this.getDisplayName();
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  public static fromApiResponse(raw: any): AdminUserDetailEntity {
    if (!raw) {
      throw new Error("Dữ liệu thông tin người dùng không hợp lệ");
    }

    const rolesRaw = raw.roles || [];
    const roles: string[] = Array.isArray(rolesRaw)
      ? rolesRaw.map((r: any) =>
          typeof r === "string" ? r : r.name || String(r)
        )
      : [];

    const userProfile = raw.userProfile || {};

    return new AdminUserDetailEntity({
      id: raw.id || raw.userId || "",
      username: raw.username || "",
      email: raw.email || "",
      fullName: userProfile.fullName || raw.fullName || "",
      phoneNumber: userProfile.phoneNumber || raw.phoneNumber || "",
      address: userProfile.address || raw.address || "",
      avatarUrl: userProfile.avatarUrl || raw.avatarUrl || "",
      roles,
      isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
      isDeleted: Boolean(raw.isDeleted),
      provider: raw.provider || "LOCAL",
    });
  }
}
