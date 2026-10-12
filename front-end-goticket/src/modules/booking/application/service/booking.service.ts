import type {
  IBookingService,
  UserOrdersResult,
  CancelPreviewResult,
  ItemOperationView,
  ItemOperationPreview,
  ExchangeRequest,
  AmendTicketRequest,
  TicketAmendmentRecord,
  TransportCheckoutPayload,
} from '../port/booking.service.interface';
import { OrderEntity } from '../../domain/entity/order.entity';
import { httpClient, type IHttpClient } from '@/shared/infrastructure/http/HttpPort';

export class BookingService implements IBookingService {
  private readonly http: IHttpClient;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async checkout(idempotencyKey: string, payload: TransportCheckoutPayload): Promise<OrderEntity> {
    if (!idempotencyKey?.trim()) throw new Error('Idempotency key không hợp lệ.');
    if (!payload?.tripId) throw new Error('Mã chuyến xe không hợp lệ.');
    const response = await this.http.post<any>(
      '/api/v1/orders/transport/checkout',
      payload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey.trim(),
        },
      }
    );
    const data = response?.data || response;
    return OrderEntity.fromApiResponse(data);
  }

  async getOrder(orderId: string): Promise<OrderEntity> {
    if (!orderId?.trim()) throw new Error('Mã đơn hàng không hợp lệ.');
    const rawOrder = await this.http.get<any>(`/api/v1/orders/${orderId.trim()}`);
    return OrderEntity.fromApiResponse(rawOrder);
  }

  async getUserOrders(page = 1, limit = 10): Promise<UserOrdersResult> {
    const zeroBasedPage = Math.max(0, page - 1);
    const response = await this.http.get<any>('/api/v1/orders', {
      params: {
        page: zeroBasedPage,
        size: limit,
        orderKind: 'GOCAR_TICKET',
      },
    });

    const pageData = response?.data || response;
    const rawList = Array.isArray(pageData?.content)
      ? pageData.content
      : Array.isArray(pageData?.data)
      ? pageData.data
      : Array.isArray(pageData)
      ? pageData
      : [];

    // Filter ONLY transport orders (GOCAR_TICKET or containing transport trip/seat items)
    const transportOrders = rawList.filter((item: any) => item?.orderKind === 'GOCAR_TICKET');

    const orders = transportOrders.map((item: any) => OrderEntity.fromApiResponse(item));

    const computedTotal = Number(pageData?.totalElements ?? pageData?.total ?? orders.length);
    const computedTotalPages = Number(pageData?.totalPages ?? (Math.ceil(computedTotal / limit) || 1));

    return {
      orders,
      total: computedTotal,
      totalPages: computedTotalPages,
      page,
      limit,
    };
  }

  async getVendorOrders(page = 1, limit = 10, filters?: { status?: string; tripId?: string; search?: string }): Promise<UserOrdersResult> {
    const zeroBasedPage = Math.max(0, page - 1);
    const params: Record<string, any> = {
      page: zeroBasedPage,
      size: limit,
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.tripId) params.tripId = filters.tripId;
    if (filters?.search?.trim()) params.search = filters.search.trim();

    const response = await this.http.get<any>('/api/v1/orders/transport/vendor', { params });

    const pageData = response?.data || response;
    const rawList = Array.isArray(pageData?.content)
      ? pageData.content
      : Array.isArray(pageData?.data)
      ? pageData.data
      : Array.isArray(pageData)
      ? pageData
      : [];

    const orders = rawList.map((item: any) => OrderEntity.fromApiResponse(item));

    return {
      orders,
      total: Number(pageData?.totalElements ?? pageData?.total ?? orders.length),
      totalPages: Number(pageData?.totalPages ?? 1),
      page,
      limit,
    };
  }

  async getHostOrders(page = 1, limit = 10): Promise<UserOrdersResult> {
    return this.getVendorOrders(page, limit);
  }

  async getVendorOrderDetail(orderId: string): Promise<OrderEntity> {
    if (!orderId?.trim()) throw new Error('Mã đơn hàng không hợp lệ');
    const response = await this.http.get<any>(`/api/v1/orders/transport/vendor/${orderId.trim()}`);
    const data = response?.data || response;
    return OrderEntity.fromApiResponse(data);
  }

  async resendTicketEmail(orderId: string): Promise<void> {
    if (!orderId?.trim()) throw new Error('Mã đơn hàng không hợp lệ.');
    await this.http.post(`/api/v1/orders/${orderId.trim()}/ticket-email/resend`);
  }

  async getItemOperation(operationId: string): Promise<ItemOperationView> {
    if (!operationId?.trim()) throw new Error('Mã operation không hợp lệ');
    const response = await this.http.get<any>(`/api/v1/orders/transport/item-operations/${operationId.trim()}`);
    return response?.data || response;
  }

  async retryItemOperation(operationId: string): Promise<ItemOperationView> {
    if (!operationId?.trim()) throw new Error('Mã operation không hợp lệ');
    return this.http.post<ItemOperationView>(
      `/api/v1/orders/transport/item-operations/${operationId.trim()}/retry`
    );
  }

  async abortItemOperation(operationId: string): Promise<ItemOperationView> {
    if (!operationId?.trim()) throw new Error('Mã operation không hợp lệ');
    return this.http.post<ItemOperationView>(
      `/api/v1/orders/transport/item-operations/${operationId.trim()}/abort`
    );
  }

  async cancelUnpaidOrder(orderId: string): Promise<void> {
    if (!orderId?.trim()) throw new Error('Mã đơn hàng không hợp lệ.');
    await this.http.post<any>(`/api/v1/orders/transport/${orderId.trim()}/cancel-unpaid`);
  }

  async launchPayment(orderId: string): Promise<{ url: string }> {
    if (!orderId?.trim()) throw new Error('Mã đơn hàng không hợp lệ.');

    return this.launchPortal({ orderId: orderId.trim() });
  }

  async launchOperationPayment(operationId: string): Promise<{ url: string }> {
    if (!operationId?.trim()) throw new Error('Mã thao tác không hợp lệ.');
    return this.launchPortal({ operationId: operationId.trim() });
  }

  private async launchPortal(payload: { orderId?: string; operationId?: string }): Promise<{ url: string }> {
    const configuredUrl = (import.meta.env.VITE_PAYMENT_PORTAL_URL || '').trim();
    const portalBase = configuredUrl || window.location.origin;

    const res = await fetch(`${portalBase}/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || 'Không thể khởi tạo cổng thanh toán GoPay.');
    }

    const data = await res.json();
    const destination = new URL(data.url, portalBase);
    return {
      url: destination.href,
    };
  }

  async previewCancelItem(orderId: string, itemId: string): Promise<CancelPreviewResult> {
    if (!orderId?.trim() || !itemId?.trim()) throw new Error('Thông tin vé không hợp lệ.');
    const response = await this.http.post<any>(
      `/api/v1/orders/transport/${orderId.trim()}/items/${itemId.trim()}/operation-preview`,
      { kind: 'CANCEL' }
    );
    const data = response?.data || response;
    return {
      orderId,
      itemId,
      originalFareVnd: String(data?.oldAmount ?? data?.originalFareVnd ?? 0),
      refundAmountVnd: String(data?.refundDue ?? data?.refundAmountVnd ?? 0),
      penaltyVnd: String(data?.fee ?? data?.penaltyVnd ?? 0),
      currency: data?.currency || 'VND',
      policyVersion: data?.policyVersion || '',
    };
  }

  async cancelItem(orderId: string, itemId: string, operationId?: string, _reason?: string): Promise<any> {
    if (!orderId?.trim() || !itemId?.trim()) throw new Error('Thông tin vé không hợp lệ.');
    const opId = operationId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
    if (!opId) throw new Error('Không thể tạo operationId cho thao tác hủy vé.');
    return this.http.post<any>(
      `/api/v1/orders/transport/${orderId.trim()}/items/${itemId.trim()}/cancel`,
      { operationId: opId }
    );
  }

  async previewExchangeItem(orderId: string, itemId: string, request: ExchangeRequest): Promise<ItemOperationPreview> {
    if (!orderId?.trim() || !itemId?.trim()) throw new Error('Thông tin vé không hợp lệ.');
    return this.http.post<ItemOperationPreview>(
      `/api/v1/orders/transport/${orderId.trim()}/items/${itemId.trim()}/operation-preview`,
      { kind: 'EXCHANGE', ...request }
    );
  }

  async exchangeItem(orderId: string, itemId: string, operationId: string, request: ExchangeRequest): Promise<ItemOperationView> {
    if (!orderId?.trim() || !itemId?.trim() || !operationId?.trim()) {
      throw new Error('Thông tin đổi vé không hợp lệ.');
    }
    return this.http.post<ItemOperationView>(
      `/api/v1/orders/transport/${orderId.trim()}/items/${itemId.trim()}/exchange`,
      { operationId: operationId.trim(), ...request }
    );
  }

  async getItemAmendments(orderId: string, itemId: string): Promise<TicketAmendmentRecord[]> {
    if (!orderId?.trim() || !itemId?.trim()) throw new Error('Thông tin vé không hợp lệ.');
    const response = await this.http.get<TicketAmendmentRecord[]>(
      `/api/v1/orders/transport/${orderId.trim()}/items/${itemId.trim()}/amendments`,
    );
    return Array.isArray(response) ? response : [];
  }

  async amendItem(orderId: string, itemId: string, request: AmendTicketRequest): Promise<TicketAmendmentRecord> {
    if (!orderId?.trim() || !itemId?.trim() || !request.commandId?.trim()) {
      throw new Error('Thông tin sửa vé không hợp lệ.');
    }
    return this.http.post<TicketAmendmentRecord>(
      `/api/v1/orders/transport/${orderId.trim()}/items/${itemId.trim()}/amend`,
      request,
    );
  }

  async retryAmendment(commandId: string): Promise<TicketAmendmentRecord> {
    if (!commandId?.trim()) throw new Error('Mã yêu cầu sửa vé không hợp lệ.');
    return this.http.post<TicketAmendmentRecord>(
      `/api/v1/orders/transport/vendor/amendments/${commandId.trim()}/retry`,
    );
  }
}
