export interface SeatTemplate {
  id: string;
  code: string;
  level: number;
  seatClass: string;
  row?: number;
  column?: number;
}

export interface RouteStop {
  id: string;
  name: string;
  order: number;
  scheduledAt?: string;
  pickupAllowed?: boolean;
  dropoffAllowed?: boolean;
  address?: string | null;
  province?: string | null;
}

export interface TransportTrip {
  id: string;
  operatorId: string;
  operatorUserId: string;
  routeId: string;
  origin: string;
  destination: string;
  departureAt: Date;
  arrivalAt: Date;
  priceVnd: string | null;
  offerListingId: string | null;
  status: string;
  totalSeats: number;
  seats: SeatTemplate[];
  stops: RouteStop[];
  version?: string;
  classPrices?: Record<string, string>;
  inventorySyncPending?: boolean;
  operatorStatus?: string;
  vehicle?: { id: string; name: string; type: string; licensePlate: string };
  operatorProfile?: {
    id: string;
    name: string;
    logoUrl: string | null;
    contactPhone: string | null;
  };
}

export interface PassengerSeat {
  orderItemId: string;
  seatId: string;
  passengerName: string;
  pickupStopId: string;
  dropoffStopId: string;
}

export interface TicketReceipt {
  orderItemId: string;
  ticketId: string;
  checkInToken: string;
}

export interface TicketForCheckIn {
  revision: number;
  id: string;
  orderId: string;
  orderItemId: string;
  tripId: string;
  status: 'ACTIVE' | 'VOID' | 'CHECKED_IN' | 'NO_SHOW';
  seatId: string;
  departureAt: Date;
  tripStatus?: string;
}
