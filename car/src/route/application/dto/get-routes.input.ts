export interface GetRoutesInput {
  userId: string;
  search?: string;
  status?: string;
  sortBy?: 'createdAt' | 'origin' | 'destination';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
