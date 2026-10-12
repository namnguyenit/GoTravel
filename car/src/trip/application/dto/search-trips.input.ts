export interface SearchTripsInput {
  origin: string;
  destination: string;
  departureDate: string;
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
