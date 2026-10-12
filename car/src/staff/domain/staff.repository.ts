export type StaffCapability =
  'SELL_CASH' | 'CHECK_IN' | 'MANAGE_TRIP' | 'CLOSE_SHIFT';

export interface StaffScope {
  canManageTrip?: boolean;
  canCloseShift?: boolean;
  tripIds?: string[];
}

export interface StaffRepository {
  authorizeOperator(
    actorId: string,
    operatorId: string,
    capability: StaffCapability,
  ): Promise<{ operatorId: string; ownerUserId: string } | null>;
  assign(
    ownerUserId: string,
    staffUserId: string,
    canSellCash: boolean,
    canCheckIn: boolean,
    active: boolean,
    scope?: StaffScope,
  ): Promise<{ operatorId: string; staffUserId: string }>;
  authorize(
    actorId: string,
    tripId: string,
    capability: StaffCapability,
  ): Promise<{
    operatorId: string;
    ownerUserId: string;
  } | null>;
  listByOperator(ownerUserId: string): Promise<any[]>;
  getAssignmentsForStaff(staffUserId: string): Promise<any[]>;
  getAssignedTripsForStaff(staffUserId: string): Promise<any[]>;
  getStaffRecord(actorId: string, operatorId?: string): Promise<any | null>;
  getOperatorByOwnerUserId(ownerUserId: string): Promise<any | null>;
}
