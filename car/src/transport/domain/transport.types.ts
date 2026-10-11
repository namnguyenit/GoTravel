export interface SeatTemplate {
  id: string;
  code: string;
  level: number;
  seatClass: string;
}

export interface RouteStop {
  id: string;
  name: string;
  order: number;
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
  id: string;
  orderId: string;
  orderItemId: string;
  tripId: string;
  status: 'ACTIVE' | 'VOID' | 'CHECKED_IN';
  departureAt: Date;
}
