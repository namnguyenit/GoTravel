import type {
  PassengerSeat,
  SeatTemplate,
  TicketForCheckIn,
  TicketReceipt,
  TransportTrip,
} from './transport.types';

export interface TransportRepository {
  stopSalesAtDeparture(): Promise<void>;
  pendingInventorySync(): Promise<string[]>;
  synchronizeInventory(
    tripId: string,
    apply: (
      enabled: boolean,
      version: number,
    ) => Promise<{ saleEnabled: boolean; syncVersion: number } | void>,
  ): Promise<void>;
  transitionTrip(
    tripId: string,
    actorId: string,
    status: 'DEPARTED' | 'COMPLETED',
  ): Promise<void>;
  pendingPublications(): Promise<Array<{ id: string; operatorUserId: string }>>;
  recordPublicationFailure(tripId: string, message: string): Promise<void>;
  pendingCompletions(): Promise<string[]>;
  markCompletionSynced(tripId: string): Promise<void>;
  updateClassPrices(
    tripId: string,
    actorId: string,
    prices: Record<string, string>,
  ): Promise<void>;
  manifest(tripId: string): Promise<
    Array<{
      ticketId: string;
      orderId: string;
      orderItemId: string;
      seatId: string;
      passengerName: string;
      pickupStopId: string;
      dropoffStopId: string;
      status: string;
      revision: number;
      checkedInAt: Date | null;
    }>
  >;
  markNoShow(
    ticketId: string,
    tripId: string,
    actorId: string,
    thresholdMinutes: number,
  ): Promise<void>;
  saveQuote(
    id: string,
    tripId: string,
    version: string,
    hash: string,
    payload: Record<string, unknown>,
    expiresAt: Date,
  ): Promise<void>;
  claimQuote(id: string, orderId: string, hash: string): Promise<void>;

  requestTripCancellation(
    tripId: string,
    operatorUserId: string,
    reason: string,
    actorId?: string,
  ): Promise<void>;
  pendingTripCancellations(): Promise<
    Array<{ tripId: string; reason: string }>
  >;
  markTripCancellationProgress(
    tripId: string,
    safeToCancel: boolean,
    completed: boolean,
    pendingOrders: number,
    pendingRefunds: number,
  ): Promise<void>;
  hasTripCancellation(tripId: string): Promise<boolean>;
  orderTickets(orderId: string): Promise<
    Array<{
      ticketId: string;
      orderItemId: string;
      tripId: string;
      seatId: string;
      status: string;
    }>
  >;
  replaceSeatTemplate(
    carId: string,
    operatorUserId: string,
    seats: Array<{
      code: string;
      level: number;
      seatClass: string;
      row?: number;
      column?: number;
    }>,
  ): Promise<SeatTemplate[]>;
  prepareTrip(
    tripId: string,
    operatorUserId: string,
    actorId?: string,
  ): Promise<TransportTrip>;
  markTripOnSale(tripId: string, listingId: string): Promise<void>;
  markTripStopSale(
    tripId: string,
    operatorUserId: string,
    actorId?: string,
  ): Promise<void>;
  findTrip(tripId: string): Promise<TransportTrip | null>;
  issueTickets(
    orderId: string,
    tripId: string,
    items: PassengerSeat[],
  ): Promise<TicketReceipt[]>;
  voidTickets(
    orderId: string,
    tripId: string,
    orderItemIds: string[],
  ): Promise<void>;
  ticketForCheckIn(token: string): Promise<TicketForCheckIn>;
  markCheckedIn(
    ticketId: string,
    actorId: string,
    expected: TicketForCheckIn,
    token: string,
  ): Promise<void>;
  amendTicket(input: {
    commandId: string;
    orderId: string;
    orderItemId: string;
    ticketId: string;
    expectedRevision: number;
    payloadHash: string;
    passengerName: string;
    pickupStopId: string;
    dropoffStopId: string;
  }): Promise<{
    ticketId: string;
    revision: number;
    passengerName: string;
    pickupStopId: string;
    dropoffStopId: string;
  }>;
}
