import type { PassengerSeat, SeatTemplate, TicketForCheckIn, TicketReceipt, TransportTrip } from './transport.types';

export interface TransportRepository {
  requestTripCancellation(tripId: string, operatorUserId: string, reason: string): Promise<void>;
  pendingTripCancellations(): Promise<Array<{ tripId: string; reason: string }>>;
  markTripCancellationProgress(tripId: string, safeToCancel: boolean,
    completed: boolean, pendingOrders: number, pendingRefunds: number): Promise<void>;
  hasTripCancellation(tripId: string): Promise<boolean>;
  orderTickets(orderId: string): Promise<Array<{
    ticketId: string; orderItemId: string; tripId: string; seatId: string; status: string;
  }>>;
  replaceSeatTemplate(
    carId: string, operatorUserId: string,
    seats: Array<{ code: string; level: number; seatClass: string }>,
  ): Promise<SeatTemplate[]>;
  prepareTrip(tripId: string, operatorUserId: string): Promise<TransportTrip>;
  markTripOnSale(tripId: string, listingId: string): Promise<void>;
  markTripStopSale(tripId: string, operatorUserId: string): Promise<void>;
  findTrip(tripId: string): Promise<TransportTrip | null>;
  issueTickets(orderId: string, tripId: string, items: PassengerSeat[]): Promise<TicketReceipt[]>;
  voidTickets(orderId: string, tripId: string, orderItemIds: string[]): Promise<void>;
  ticketForCheckIn(token: string): Promise<TicketForCheckIn>;
  markCheckedIn(ticketId: string, actorId: string): Promise<void>;
}
