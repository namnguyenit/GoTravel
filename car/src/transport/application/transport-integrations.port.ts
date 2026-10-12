import type { TransportTrip } from '../domain/transport.types';

export interface OfferReceipt {
  listingId: string;
  status: string;
}

export interface FulfillmentSummary {
  orderId: string;
  tripId: string;
  status: string;
  paymentMethod: string;
  items: Array<{
    orderItemId: string;
    tripId?: string;
    itemState?: string;
    boardingStatus?: string;
    ticketRevision?: number;
    seatId: string;
    passengerName: string;
    pickupStopId: string;
    dropoffStopId: string;
  }>;
}

export interface InventoryOrderStatus {
  orderId: string;
  tripId: string;
  seatIds: string[];
  status: string;
}

export interface TransportIntegrations {
  seatOwnership(
    orderId: string,
    tripId: string,
    seatId: string,
  ): Promise<{
    orderId: string;
    tripId: string;
    seatId: string;
    status: string;
  }>;
  itemOperation(
    id: string,
  ): Promise<{ plan: Record<string, unknown>; state: string }>;
  itemInventory(id: string): Promise<{ operationId: string; state: string }>;
  getOffer(routeId: string): Promise<OfferReceipt>;
  activeOfferRoutes(): Promise<string[]>;
  completeTrip(tripId: string): Promise<void>;
  changeSeatBlock(
    tripId: string,
    seatIds: string[],
    blocked: boolean,
    actorId: string,
    reason: string,
  ): Promise<void>;
  requestTripCancellation(
    tripId: string,
    reason: string,
  ): Promise<{
    safeToCancel: boolean;
    completed: boolean;
    pendingOrders: number;
    pendingRefunds: number;
  }>;
  upsertOffer(trip: TransportTrip): Promise<OfferReceipt>;
  initializeSeats(trip: TransportTrip): Promise<void>;
  setSaleEnabled(
    tripId: string,
    enabled: boolean,
    version: number,
  ): Promise<{ saleEnabled: boolean; syncVersion: number }>;
  getSeatStatus(
    tripId: string,
  ): Promise<Array<{ seatId: string; code: string; status: string }>>;
  getOrderStatus(orderId: string): Promise<InventoryOrderStatus>;
  getFulfillment(orderId: string): Promise<FulfillmentSummary>;
}
