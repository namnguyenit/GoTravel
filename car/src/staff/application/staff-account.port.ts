export interface StaffAccountPort {
  isApprovedVendor(userId: string): Promise<boolean>;
  isActive(userId: string): Promise<boolean>;
}
