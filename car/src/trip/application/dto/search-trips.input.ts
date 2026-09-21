export interface SearchTripsInput {
  origin: string;
  destination: string;
  departureDate: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  operatorId?: string;
  sortBy?: 'departureTime' | 'pricePerSeat';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
