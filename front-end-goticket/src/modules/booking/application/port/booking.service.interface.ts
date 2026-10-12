import type { OrderEntity } from '../../domain/entity/order.entity';

export interface CancelPreviewResult {
  orderId: string;
  itemId: string;
  originalFareVnd: string;
  refundAmountVnd: string;
  penaltyVnd: string;
  currency: string;
  policyVersion?: string;
}

export interface ItemOperationView {
  operationId: string;
  orderId: string;
  itemId: string;
  kind: 'CANCEL' | 'EXCHANGE';
  state: string;
  expiresAt?: string;
  oldTripId?: string;
  oldSeatId?: string;
  newTripId?: string;
  newSeatId?: string;
  oldAmount: string;
  newAmount: string;
  fee: string;
  topup: string;
  refundDue: string;
  error?: string;
}

export interface ExchangeRequest {
  tripId: string;
  seatId: string;
  pickupStopId: string;
  dropoffStopId: string;
}

export interface ItemOperationPreview {
  kind: 'CANCEL' | 'EXCHANGE';
  currency: string;
  oldAmount: string;
  newAmount: string;
  fee: string;
  topup: string;
  refundDue: string;
  policyVersion?: string;
}

export interface TicketAmendmentRecord {
  commandId: string;
  orderId: string;
  orderItemId: string;
  expectedRevision: number;
  newRevision?: number;
  passengerName: string;
  pickupStopId: string;
  dropoffStopId: string;
  status: string;
  errorReason?: string;
  createdAt: string;
  appliedAt?: string;
  retryCount: number;
}

export interface AmendTicketRequest {
  commandId: string;
  passengerName: string;
  pickupStopId: string;
  dropoffStopId: string;
}

export interface UserOrdersResult {
  orders: OrderEntity[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface TransportCheckoutPassenger {
  seatId: string;
  name: string;
  pickupStopId: string;
  dropoffStopId: string;
}

export interface TransportCheckoutPayload {
  tripId: string;
  fullName: string;
  email: string;
  phone: string;
  passengers: TransportCheckoutPassenger[];
}

export interface IBookingService {
  checkout(idempotencyKey: string, payload: TransportCheckoutPayload): Promise<OrderEntity>;
  getOrder(orderId: string): Promise<OrderEntity>;
  getUserOrders(page?: number, limit?: number): Promise<UserOrdersResult>;
  getHostOrders(page?: number, limit?: number): Promise<UserOrdersResult>;
  getVendorOrders(page?: number, limit?: number, filters?: { status?: string; tripId?: string; search?: string }): Promise<UserOrdersResult>;
  getVendorOrderDetail(orderId: string): Promise<OrderEntity>;
  resendTicketEmail(orderId: string): Promise<void>;
  getItemOperation(operationId: string): Promise<ItemOperationView>;
  retryItemOperation(operationId: string): Promise<ItemOperationView>;
  abortItemOperation(operationId: string): Promise<ItemOperationView>;
  cancelUnpaidOrder(orderId: string): Promise<void>;
  launchPayment(orderId: string): Promise<{ url: string }>;
  launchOperationPayment(operationId: string): Promise<{ url: string }>;
  previewCancelItem(orderId: string, itemId: string): Promise<CancelPreviewResult>;
  cancelItem(orderId: string, itemId: string, operationId?: string, reason?: string): Promise<any>;
  previewExchangeItem(orderId: string, itemId: string, request: ExchangeRequest): Promise<ItemOperationPreview>;
  exchangeItem(orderId: string, itemId: string, operationId: string, request: ExchangeRequest): Promise<ItemOperationView>;
  getItemAmendments(orderId: string, itemId: string): Promise<TicketAmendmentRecord[]>;
  amendItem(orderId: string, itemId: string, request: AmendTicketRequest): Promise<TicketAmendmentRecord>;
  retryAmendment(commandId: string): Promise<TicketAmendmentRecord>;
}

