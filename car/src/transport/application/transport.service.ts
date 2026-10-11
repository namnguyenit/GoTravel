import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { TransportRepository } from '../domain/transport.repository';
import type { PassengerSeat, TransportTrip } from '../domain/transport.types';
import type { TransportIntegrations } from './transport-integrations.port';
import { StaffService } from '../../staff/application/staff.service';

export interface QuotePassenger {
  seatId: string;
  name: string;
  pickupStopId: string;
  dropoffStopId: string;
}

@Injectable()
export class TransportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransportService.name);
  private cancellationTimer?: NodeJS.Timeout;
  private cancellationRunActive = false;
  constructor(
    @Inject('TransportRepository') private readonly repository: TransportRepository,
    @Inject('TransportIntegrations') private readonly integrations: TransportIntegrations,
    private readonly staff: StaffService,
  ) {}

  onModuleInit(): void {
    this.cancellationTimer = setInterval(() => {
      void this.reconcileCancellations();
    }, 30_000);
    this.cancellationTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cancellationTimer) clearInterval(this.cancellationTimer);
  }

  async requestTripCancellation(tripId: string, operatorUserId: string, reason: string) {
    const normalized = typeof reason === 'string' ? reason.trim() : '';
    if (!normalized || normalized.length > 500) throw new BadRequestException('Lý do hủy chuyến không hợp lệ');
    const trip = await this.repository.findTrip(tripId);
    if (!trip || trip.operatorUserId !== operatorUserId) throw new NotFoundException();
    if (!['ON_SALE', 'STOP_SALE', 'CANCELLED'].includes(trip.status)) {
      throw new ConflictException('Chuyến không thể hủy qua quy trình thông thường');
    }
    if (trip.status !== 'CANCELLED') await this.integrations.setSaleEnabled(tripId, false);
    await this.repository.requestTripCancellation(tripId, operatorUserId, normalized);
    try {
      await this.reconcileOneCancellation(tripId, normalized);
    } catch (error) {
      this.logger.warn(`Trip cancellation ${tripId} queued for retry: ${String(error)}`);
    }
    return { tripId, status: 'PROCESSING' };
  }

  async reconcileCancellations(): Promise<void> {
    if (this.cancellationRunActive) return;
    this.cancellationRunActive = true;
    try {
      for (const cancellation of await this.repository.pendingTripCancellations()) {
        try {
          await this.reconcileOneCancellation(cancellation.tripId, cancellation.reason);
        } catch (error) {
          this.logger.warn(`Trip cancellation ${cancellation.tripId} pending: ${String(error)}`);
        }
      }
    } finally {
      this.cancellationRunActive = false;
    }
  }

  private async reconcileOneCancellation(tripId: string, reason: string): Promise<void> {
    const result = await this.integrations.requestTripCancellation(tripId, reason);
    await this.repository.markTripCancellationProgress(tripId, result.safeToCancel,
      result.completed, result.pendingOrders, result.pendingRefunds);
  }

  async replaceSeatTemplate(
    carId: string, operatorUserId: string,
    requested: Array<{ code: string; level: number; seatClass: string }>,
  ) {
    if (!requested || requested.length === 0 || requested.length > 100 ||
        requested.some((seat) => !seat.code?.trim() || seat.code.length > 32 ||
          !Number.isInteger(seat.level) || seat.level < 1 || seat.level > 3 ||
          !seat.seatClass?.trim() || seat.seatClass.length > 32)) {
      throw new BadRequestException('Sơ đồ ghế không hợp lệ');
    }
    const seats = requested.map((seat) => ({
      code: seat.code.trim().toUpperCase(),
      level: seat.level,
      seatClass: seat.seatClass.trim().toUpperCase(),
    }));
    if (new Set(seats.map((seat) => seat.code)).size !== seats.length) {
      throw new BadRequestException('Mã ghế bị trùng');
    }
    return this.repository.replaceSeatTemplate(carId, operatorUserId, seats);
  }

  async publish(tripId: string, operatorUserId: string) {
    const trip = await this.repository.prepareTrip(tripId, operatorUserId);
    const offer = await this.integrations.upsertOffer(trip);
    if (offer.status !== 'ACTIVE') {
      throw new ConflictException('Offer tuyến đang chờ Catalog duyệt; chuyến chưa mở bán');
    }
    await this.integrations.initializeSeats(trip);
    await this.integrations.setSaleEnabled(tripId, true);
    await this.repository.markTripOnSale(tripId, offer.listingId);
    return { tripId, offerListingId: offer.listingId, status: 'ON_SALE' };
  }

  async stopSale(tripId: string, operatorUserId: string) {
    const trip = await this.repository.findTrip(tripId);
    if (!trip || trip.operatorUserId !== operatorUserId) throw new NotFoundException();
    if (trip.status !== 'ON_SALE' && trip.status !== 'STOP_SALE') {
      throw new ConflictException('Chuyến không đang mở bán');
    }
    await this.integrations.setSaleEnabled(tripId, false);
    await this.repository.markTripStopSale(tripId, operatorUserId);
    return { tripId, status: 'STOP_SALE' };
  }

  async quote(tripId: string, passengers: QuotePassenger[]) {
    if (!passengers || passengers.length === 0 || passengers.length > 10 ||
        new Set(passengers.map((passenger) => passenger.seatId)).size !== passengers.length) {
      throw new BadRequestException('Ghế hành khách không hợp lệ');
    }
    const trip = await this.repository.findTrip(tripId);
    this.assertSaleable(trip);
    const activeSeats = new Map(trip!.seats.map((seat) => [seat.id, seat]));
    const stops = new Map(trip!.stops.map((stop) => [stop.id, stop]));
    const quotedSeats = passengers.map((passenger) => {
      const seat = activeSeats.get(passenger.seatId);
      const pickup = stops.get(passenger.pickupStopId);
      const dropoff = stops.get(passenger.dropoffStopId);
      if (!seat || !pickup || !dropoff || pickup.order >= dropoff.order ||
          !passenger.name?.trim()) {
        throw new BadRequestException('Ghế hoặc điểm đón trả không hợp lệ');
      }
      return { seatId: seat.id, code: seat.code, price: trip!.priceVnd };
    });
    const total = BigInt(trip!.priceVnd!) * BigInt(passengers.length);
    return {
      tripId: trip!.id,
      listingId: trip!.offerListingId,
      operatorId: trip!.operatorId,
      operatorUserId: trip!.operatorUserId,
      routeTitle: trip!.origin + ' – ' + trip!.destination,
      departureAt: trip!.departureAt.toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
      totalAmount: total.toString(),
      currency: 'VND',
      seats: quotedSeats,
    };
  }

  async seatMap(tripId: string) {
    const trip = await this.repository.findTrip(tripId);
    this.assertSaleable(trip);
    return this.integrations.getSeatStatus(tripId);
  }

  async orderTickets(orderId: string) {
    return this.repository.orderTickets(orderId);
  }

  async issueTickets(orderId: string, items: PassengerSeat[]) {
    if (!items || items.length === 0 || items.length > 10 ||
        new Set(items.map((item) => item.orderItemId)).size !== items.length) {
      throw new BadRequestException('Danh sách vé không hợp lệ');
    }
    const [order, held] = await Promise.all([
      this.integrations.getFulfillment(orderId),
      this.integrations.getOrderStatus(orderId),
    ]);
    if (order.orderId !== orderId || order.tripId !== held.tripId ||
        !['FULFILLMENT_PENDING', 'CASH_RECEIVED_PENDING_RECONCILIATION', 'CONFIRMED'].includes(order.status) ||
        held.status !== 'SOLD' || order.items.length !== items.length) {
      throw new ConflictException('Order chưa thanh toán hoặc ghế chưa được chốt bán');
    }
    const trustedItems = new Map(order.items.map((item) => [item.orderItemId, item]));
    const soldSeats = new Set(held.seatIds);
    for (const item of items) {
      const trusted = trustedItems.get(item.orderItemId);
      if (!trusted || !soldSeats.has(item.seatId) ||
          trusted.seatId !== item.seatId ||
          trusted.passengerName !== item.passengerName ||
          trusted.pickupStopId !== item.pickupStopId ||
          trusted.dropoffStopId !== item.dropoffStopId) {
        throw new ConflictException('Thông tin vé không khớp Order/Inventory');
      }
    }
    if (soldSeats.size !== items.length) {
      throw new ConflictException('Số ghế đã bán không khớp số vé');
    }
    return this.repository.issueTickets(orderId, order.tripId, items);
  }

  async voidTickets(orderId: string) {
    const order = await this.integrations.getFulfillment(orderId);
    if (order.orderId !== orderId || order.status !== 'CANCELLATION_PENDING' ||
        !order.items.length) {
      throw new ConflictException('Order chưa đủ điều kiện hủy vé');
    }
    await this.repository.voidTickets(orderId, order.tripId,
      order.items.map((item) => item.orderItemId));
    return { orderId, status: 'VOID' };
  }

  async checkIn(token: string, actorId: string) {
    const ticket = await this.repository.ticketForCheckIn(token);
    if (await this.repository.hasTripCancellation(ticket.tripId)) {
      throw new ConflictException('Chuyến đang hủy, không thể check-in');
    }
    await this.staff.verify(actorId, ticket.tripId, 'CHECK_IN');
    if (ticket.status === 'VOID') throw new ConflictException('Vé đã hủy');
    const now = Date.now();
    if (now < ticket.departureAt.getTime() - 4 * 60 * 60_000 ||
        now > ticket.departureAt.getTime() + 2 * 60 * 60_000) {
      throw new ConflictException('Ngoài thời gian check-in');
    }
    const [order, seats] = await Promise.all([
      this.integrations.getFulfillment(ticket.orderId),
      this.integrations.getOrderStatus(ticket.orderId),
    ]);
    if (order.status !== 'CONFIRMED' || order.tripId !== ticket.tripId ||
        !order.items.some((item) => item.orderItemId === ticket.orderItemId) ||
        seats.status !== 'SOLD' || seats.tripId !== ticket.tripId) {
      throw new ConflictException('Order hoặc ghế không còn hiệu lực');
    }
    await this.repository.markCheckedIn(ticket.id, actorId);
    return { ticketId: ticket.id, status: 'CHECKED_IN' };
  }

  private assertSaleable(trip: TransportTrip | null): void {
    if (!trip) throw new NotFoundException('Không có chuyến');
    if (trip.status !== 'ON_SALE' || !trip.offerListingId ||
        !trip.priceVnd || !/^[1-9]\d*$/.test(trip.priceVnd) ||
        trip.departureAt.getTime() <= Date.now() + 15 * 60_000) {
      throw new ConflictException('Chuyến chưa mở bán hoặc đã khởi hành');
    }
  }
}
