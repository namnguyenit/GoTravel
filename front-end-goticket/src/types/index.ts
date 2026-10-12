export interface Car {
  id: string;
  name: string;
  brand?: string;
  licensePlate: string;
  seatCapacity: number;
  type?: string;
  operatorId?: string;
  operatorName?: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  images?: string[];
  pricePerTrip?: number;
  description?: string;
  createdAt?: string;
}

export interface OperatorApplication {
  id: string;
  userId: string;
  companyName: string;
  businessLicense: string;
  phoneNumber: string;
  email: string;
  address: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}
