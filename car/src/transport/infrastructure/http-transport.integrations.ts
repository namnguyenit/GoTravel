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
  private readonly catalogUrl = process.env.CATALOG_INTERNAL_URL || 'http://127.0.0.1:8082';
  private readonly inventoryUrl = process.env.INVENTORY_INTERNAL_URL || 'http://127.0.0.1:8083';
  private readonly cartUrl = process.env.CART_INTERNAL_URL || 'http://127.0.0.1:8084';

  async requestTripCancellation(tripId: string, reason: string) {
    return this.call<{ safeToCancel: boolean; completed: boolean;
      pendingOrders: number; pendingRefunds: number }>(
      this.cartUrl, '/api/v1/internal/orders/transport/trips/' + tripId + '/cancellation',
      'PUT', { reason },
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
        fromPrice: trip.priceVnd,
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

  async setSaleEnabled(tripId: string, enabled: boolean): Promise<void> {
    await this.call(
      this.inventoryUrl,
      '/api/v1/internal/inventory/transport/trips/' + tripId +
      '/sale-enabled?enabled=' + String(enabled),
      'PUT',
    );
  }

  async getSeatStatus(tripId: string): Promise<Array<{ seatId: string; code: string; status: string }>> {
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

  private async call<T>(baseUrl: string, path: string, method: string, body?: unknown): Promise<T> {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Chưa cấu hình token nội bộ');
    let response: Response;
    try {
      response = await fetch(baseUrl + path, {
        method,
        headers: {
          'x-internal-service-token': token,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('Service liên kết chưa sẵn sàng');
    }
    if (!response.ok) {
      throw new BadGatewayException('Service liên kết trả lỗi ' + response.status);
    }
    const result = (await response.json()) as { success?: boolean; data?: T };
    if (!result.success || result.data === undefined && method === 'GET') {
      throw new BadGatewayException('Service liên kết không xác nhận kết quả');
    }
    return result.data as T;
  }
}
