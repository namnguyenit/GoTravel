export interface ItemOperationPlan {
  operationId: string;
  orderId: string;
  itemId: string;
  actorId: string;
  kind: 'CANCEL' | 'EXCHANGE';
  requestHash: string;
  oldTicketId: string;
  expectedRevision: number;
  oldTripId: string;
  oldSeatId: string;
  newTripId: string | null;
  newSeatId: string | null;
  passengerName: string;
  pickupStopId: string | null;
  dropoffStopId: string | null;
  expiresAt: string;
  forcedTripCancellation?: boolean;
}
export interface ItemTicketResult {
  operationId: string;
  state: string;
  ticketId?: string;
  revision?: number;
  checkInToken?: string;
}
export interface ItemTicketRepository {
  apply(
    plan: ItemOperationPlan,
    action: 'prepare' | 'commit' | 'abort',
  ): Promise<ItemTicketResult>;
}
