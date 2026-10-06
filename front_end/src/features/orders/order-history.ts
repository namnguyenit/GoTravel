export type OrderItem = {
  itemId?: string;
  listingId?: string;
  listingTitle?: string;
  thumbnailUrl?: string;
  startDate?: string;
  endDate?: string;
  timeSlot?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
};

export type PurchaseOrder = {
  orderId: string;
  orderNumber?: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  createdAt?: string;
  ticketEmailSent?: boolean;
  ticketEmailSentAt?: string;
  ticketEmailRecipient?: string;
  ticketEmailAttempts?: number;
  customerInfo?: { fullName?: string; email?: string; phone?: string };
  items?: OrderItem[];
};

export type OrderPage = {
  content: PurchaseOrder[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export const historyFilters = [
  { key: "all", label: "Tất cả", statuses: [] },
  { key: "paid", label: "Đã thanh toán", statuses: ["CONFIRMED", "COMPLETED"] },
  {
    key: "pending",
    label: "Chờ thanh toán",
    statuses: ["PENDING", "PAYMENT_PENDING"],
  },
  { key: "cancelled", label: "Đã hủy", statuses: ["CANCELLED"] },
];

export const isPaidOrder = (order: PurchaseOrder) =>
  ["CONFIRMED", "COMPLETED"].includes(order.status ?? "");

export function orderStatus(order: PurchaseOrder) {
  switch (order.status) {
    case "COMPLETED":
      return { label: "Hoàn tất", color: "bg-emerald-50 text-emerald-700" };
    case "CONFIRMED":
      return { label: "Đã xác nhận", color: "bg-emerald-50 text-emerald-700" };
    case "PENDING":
    case "PAYMENT_PENDING":
      return { label: "Chờ thanh toán", color: "bg-amber-50 text-amber-800" };
    case "CANCELLED":
      return { label: "Đã hủy", color: "bg-zinc-100 text-zinc-600" };
    default:
      return { label: "Đang cập nhật", color: "bg-zinc-100 text-zinc-600" };
  }
}

function unwrap(response: unknown) {
  const root = response as { data?: unknown };
  const data = root?.data as { data?: unknown } | undefined;
  return data?.data ?? data ?? response;
}

export function readOrder(response: unknown): PurchaseOrder {
  const order = unwrap(response) as PurchaseOrder;
  if (!order || typeof order.orderId !== "string" || !order.orderId) {
    throw new Error("Không đọc được thông tin đơn hàng. Vui lòng thử lại.");
  }
  return order;
}

export function readOrderPage(response: unknown): OrderPage {
  const page = unwrap(response) as OrderPage;
  if (
    !page ||
    !Array.isArray(page.content) ||
    !Number.isFinite(page.totalElements) ||
    !Number.isFinite(page.totalPages)
  ) {
    throw new Error("Không đọc được lịch sử mua hàng. Vui lòng thử lại.");
  }
  return page;
}

export const orderCode = (order: PurchaseOrder) =>
  order.orderNumber?.trim() || order.orderId;
export const money = (value?: number, currency = "VND") =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export function dateLabel(value?: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(date);
}
