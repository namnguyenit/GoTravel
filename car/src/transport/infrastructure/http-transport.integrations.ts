import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  FulfillmentSummary,
  InventoryOrderStatus,
  OfferReceipt,
  TransportIntegrations,
} from '../application/transport-integrations.port';
import type { TransportTrip } from '../domain/transport.types';

@Injectable()
export class HttpTransportIntegrations implements TransportIntegrations {
  private readonly catalogUrl =
    process.env.CATALOG_INTERNAL_URL || 'http://127.0.0.1:8082';
  private readonly inventoryUrl =
    process.env.INVENTORY_INTERNAL_URL || 'http://127.0.0.1:8083';
  private readonly cartUrl =
    process.env.CART_INTERNAL_URL || 'http://127.0.0.1:8084';

  async seatOwnership(
    orderId: string,
    tripId: string,
    seatId: string,
  ): Promise<{
    orderId: string;
    tripId: string;
    seatId: string;
    status: string;
  }> {
    return this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/orders/' +
        orderId +
        '/trips/' +
        tripId +
        '/seats/' +
        seatId,
      'GET',
    );
  }
  async itemOperation(
    id: string,
  ): Promise<{ plan: Record<string, unknown>; state: string }> {
    return this.call(
      this.cartUrl,
      '/api/v1/internal/orders/transport/item-operations/' + id,
      'GET',
    );
  }
  async itemInventory(
    id: string,
  ): Promise<{ operationId: string; state: string }> {
    return this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/item-operations/' + id,
      'GET',
    );
  }
  async getOffer(routeId: string): Promise<OfferReceipt> {
    return this.call(
      this.catalogUrl,
      '/api/v1/internal/catalog/transport-offers/routes/' + routeId,
      'GET',
    );
  }
  async activeOfferRoutes(): Promise<string[]> {
    return this.call(
      this.catalogUrl,
      '/api/v1/internal/catalog/transport-offers/active-routes',
      'GET',
    );
  }

  async completeTrip(tripId: string): Promise<void> {
    await this.call(
      this.cartUrl,
      '/api/v1/internal/orders/transport/trips/' + tripId + '/complete',
      'PUT',
    );
  }

  async changeSeatBlock(
    tripId: string,
    seatIds: string[],
    blocked: boolean,
    actorId: string,
    reason: string,
  ) {
    await this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/trips/' + tripId + '/seat-blocks',
      'PUT',
      { seatIds, blocked, actorId, reason },
    );
  }

  async requestTripCancellation(tripId: string, reason: string) {
    return this.call<{
      safeToCancel: boolean;
      completed: boolean;
      pendingOrders: number;
      pendingRefunds: number;
    }>(
      this.cartUrl,
      '/api/v1/internal/orders/transport/trips/' + tripId + '/cancellation',
      'PUT',
      { reason },
    );
  }

  async upsertOffer(trip: TransportTrip): Promise<OfferReceipt> {
    return this.call<OfferReceipt>(
      this.catalogUrl,
      '/api/v1/internal/catalog/transport-offers/routes/' + trip.routeId,
      'PUT',
      {
        operatorId: trip.operatorId,
        operatorUserId: trip.operatorUserId,
        routeId: trip.routeId,
        origin: trip.origin,
        destination: trip.destination,
        province: trip.origin,
        description: null,
        fromPrice: trip.seats
          .map((seat) =>
            BigInt(trip.classPrices?.[seat.seatClass] ?? trip.priceVnd!),
          )
          .reduce((a, b) => (a < b ? a : b))
          .toString(),
        latitude: null,
        longitude: null,
        thumbnailUrl: null,
      },
    );
  }

  async initializeSeats(trip: TransportTrip): Promise<void> {
    await this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/trips/' + trip.id,
      'PUT',
      {
        operatorId: trip.operatorId,
        departureAt: trip.departureAt.toISOString(),
        seats: trip.seats.map((seat) => ({ seatId: seat.id, code: seat.code })),
      },
    );
  }

  async setSaleEnabled(
    tripId: string,
    enabled: boolean,
    version: number,
  ): Promise<{ saleEnabled: boolean; syncVersion: number }> {
    const query =
      version !== undefined
        ? '/sale-enabled?enabled=' +
          String(enabled) +
          '&version=' +
          String(version)
        : '/sale-enabled?enabled=' + String(enabled);
    return this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/trips/' + tripId + query,
      'PUT',
    );
  }

  async getSeatStatus(
    tripId: string,
  ): Promise<Array<{ seatId: string; code: string; status: string }>> {
    return this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/trips/' + tripId + '/seats',
      'GET',
    );
  }

  async getOrderStatus(orderId: string): Promise<InventoryOrderStatus> {
    return this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/orders/' + orderId + '/status',
      'GET',
    );
  }

  async getFulfillment(orderId: string): Promise<FulfillmentSummary> {
    return this.call(
      this.cartUrl,
      '/api/v1/internal/orders/' + orderId + '/transport-fulfillment',
      'GET',
    );
  }

  private async call<T>(
    baseUrl: string,
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    let token = process.env.INTERNAL_SERVICE_TOKEN;
    const configured = process.env.TRANSPORT_INTERNAL_TOKENS;
    if (configured) {
      const target =
        baseUrl === this.catalogUrl
          ? 'catalog'
          : baseUrl === this.inventoryUrl
            ? 'inventory'
            : 'cart';
      let tokens: Record<string, string>;
      try {
        tokens = JSON.parse(configured) as Record<string, string>;
      } catch {
        throw new ServiceUnavailableException(
          'Cấu hình service credential không hợp lệ',
        );
      }
      token = tokens[target];
      if (!token || token.length < 32)
        throw new ServiceUnavailableException(
          'Thiếu credential cho service đích',
        );
    } else if (process.env.TRANSPORT_INTERNAL_AUTH_REQUIRED === 'true') {
      throw new ServiceUnavailableException(
        'Chưa cấu hình credential riêng cho GoCar',
      );
    }
    if (!token)
      throw new ServiceUnavailableException('Chưa cấu hình token nội bộ');
    let response: Response;
    try {
      response = await fetch(baseUrl + path, {
        method,
        headers: {
          'x-internal-service-token': token,
          ...(configured ? { 'x-internal-caller': 'car' } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err: any) {
      console.error('Failed to call internal service', baseUrl + path, err);
      throw new ServiceUnavailableException(
        'Service liên kết chưa sẵn sàng: ' + (err?.message || String(err)),
      );
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Internal service returned non-ok', response.status, errText);
      throw new BadGatewayException(
        `Service liên kết trả lỗi ${response.status}: ${errText}`,
      );
    }
    const result = (await response.json()) as { success?: boolean; data?: T };
    if (!result.success || (result.data === undefined && method === 'GET')) {
      throw new BadGatewayException('Service liên kết không xác nhận kết quả');
    }
    return result.data as T;
  }
}
