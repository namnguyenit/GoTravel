import { Api } from "@/shared/api";

export interface BookNowPayload {
  item: {
    listingId: string;
    hostId?: string;
    listingTitle?: string;
    thumbnailUrl?: string;
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD"
    timeSlot?: string;
    quantity: number;
    unitPrice?: number;
  };
  fullName: string;
  email: string;
  phone: string;
}

export type OrderDisputeStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "RESOLVED"
  | "REJECTED"
  | "REFUNDED"
  | string;

export type OrderDispute = {
  disputeId?: string;
  orderId?: string;
  userId?: string;
  orderNumber?: string;
  orderStatus?: string;
  orderAmount?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  reason?: string;
  description?: string;
  status?: OrderDisputeStatus;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

const OrderService = {
  bookNow: async (payload: BookNowPayload) => {
    return await Api.post("/v1/orders/book-now", payload);
  },
  checkoutCart: async (payload: {
    itemIds: string[];
    customerInfo: { fullName: string; email: string; phone: string };
  }) => {
    return await Api.post("/v1/orders/checkout-cart", payload);
  },
  getOrder: async (orderId: string) => {
    return await Api.get(`/v1/orders/${orderId}`);
  },
  getUserOrders: async (
    page = 0,
    size = 10,
    filters: { statuses?: string[]; search?: string } = {},
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (filters.statuses?.length)
      params.set("statuses", filters.statuses.join(","));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    return await Api.get(`/v1/orders?${params}`);
  },
  createDispute: async (payload: {
    orderId: string;
    reason: string;
    description?: string;
  }) => {
    return await Api.post("/v1/orders/disputes", payload);
  },
  getMyDisputes: async (page = 0, size = 20) => {
    return await Api.get(`/v1/orders/disputes?page=${page}&size=${size}`);
  },
  cancelOrder: async (orderId: string) => {
    return await Api.put(`/v1/orders/${orderId}/cancel`, {});
  },
  resendTicketEmail: async (orderId: string) => {
    return await Api.post(`/v1/orders/${orderId}/ticket-email/resend`, {});
  },
  checkPurchased: async (listingId: string) => {
    return await Api.get(`/v1/orders/check-purchased/${listingId}`);
  },
};

export default OrderService;
