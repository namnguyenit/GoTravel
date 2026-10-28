export interface SearchTripsInput {
  originRegion?: string;
  destinationRegion?: string;
  origin?: string;
  destination?: string;
  departureDate?: string;
  discover?: boolean;
  preferredOrigin?: string;
  type?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  timeSlots?: string[];
  minPrice?: string;
  maxPrice?: string;
  operatorId?: string;
  sortBy?: 'departureTime' | 'pricePerSeat';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
