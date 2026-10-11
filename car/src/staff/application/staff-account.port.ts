export interface StaffAccountPort {
  isActive(userId: string): Promise<boolean>;
}
