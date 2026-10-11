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
  requestTripCancellation(tripId: string, reason: string): Promise<{
    safeToCancel: boolean; completed: boolean; pendingOrders: number; pendingRefunds: number;
  }>;
  upsertOffer(trip: TransportTrip): Promise<OfferReceipt>;
  initializeSeats(trip: TransportTrip): Promise<void>;
  setSaleEnabled(tripId: string, enabled: boolean): Promise<void>;
  getSeatStatus(tripId: string): Promise<Array<{ seatId: string; code: string; status: string }>>;
  getOrderStatus(orderId: string): Promise<InventoryOrderStatus>;
  getFulfillment(orderId: string): Promise<FulfillmentSummary>;
}
