/**
 * Domain Entity đại diện cho Phiên Đăng Nhập (User Session) trong hệ sinh thái GoTravel / GoTicket.
 */

export type AppRole = 'CUSTOMER' | 'TICKET_VENDOR' | 'STAFF' | 'ADMIN';
export type StaffCapability = 'CHECK_IN' | 'SELL_CASH' | 'MANAGE_TRIP' | 'CASH_VIEW' | 'CLOSE_SHIFT';

export interface UserSessionProps {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  roles: AppRole[];
  operatorId?: string | null;
  operatorName?: string | null;
  staffCapabilities?: StaffCapability[];
  staffTripIds?: string[];
  staffAllTrips?: boolean;
}

export class UserSession {
  constructor(private readonly props: UserSessionProps) {}

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get fullName(): string { return this.props.fullName; }
  get phone(): string | null | undefined { return this.props.phone; }
  get avatarUrl(): string | null | undefined { return this.props.avatarUrl; }
  get roles(): AppRole[] { return [...this.props.roles]; }
  get operatorId(): string | null | undefined { return this.props.operatorId; }
  get operatorName(): string | null | undefined { return this.props.operatorName; }
  get staffCapabilities(): StaffCapability[] { return this.props.staffCapabilities ?? []; }
  get staffTripIds(): string[] { return this.props.staffTripIds ?? []; }
  get staffAllTrips(): boolean { return this.props.staffAllTrips ?? false; }

  public isAdmin(): boolean {
    return this.props.roles.includes('ADMIN');
  }

  public isVendor(): boolean {
    return this.props.roles.includes('TICKET_VENDOR');
  }

  public isStaff(): boolean {
    return this.props.roles.includes('STAFF');
  }

  public isCustomer(): boolean {
    return this.props.roles.includes('CUSTOMER') || this.props.roles.length === 0;
  }

  public hasRole(role: AppRole): boolean {
    return this.props.roles.includes(role);
  }

  public hasCapability(capability: StaffCapability): boolean {
    // Owner nhà xe có toàn bộ capabilities
    if (this.isVendor()) return true;
    if (this.isAdmin()) return true;
    return this.staffCapabilities.includes(capability);
  }

  public canManageTrips(): boolean {
    return this.hasCapability('MANAGE_TRIP');
  }

  public canCheckIn(): boolean {
    return this.hasCapability('CHECK_IN');
  }

  public canSellCash(): boolean {
    return this.hasCapability('SELL_CASH');
  }

  public canViewCashFinance(): boolean {
    // allTrips=true KHÔNG mặc định có quyền tài chính, phải có CASH_VIEW
    return this.hasCapability('CASH_VIEW');
  }
}
