export interface StaffAccountPort {
  isApprovedVendor(userId: string): Promise<boolean>;
  isActive(userId: string): Promise<boolean>;
  grantStaffRole?(userId: string): Promise<void>;
  lookup(query: string): Promise<{
    id: string;
    username: string;
    email: string;
    fullName?: string;
    phoneNumber?: string;
  } | null>;
}
