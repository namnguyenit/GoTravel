export type StaffCapability = 'SELL_CASH' | 'CHECK_IN';

export interface StaffRepository {
  assign(ownerUserId: string, staffUserId: string, canSellCash: boolean,
    canCheckIn: boolean, active: boolean): Promise<{ operatorId: string; staffUserId: string }>;
  authorize(actorId: string, tripId: string, capability: StaffCapability): Promise<{
    operatorId: string;
    ownerUserId: string;
  } | null>;
}
