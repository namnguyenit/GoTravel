import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { TransportRepository } from '../domain/transport.repository';
import type { TransportIntegrations } from './transport-integrations.port';
import { TransportService } from './transport.service';
import { StaffService } from '../../staff/application/staff.service';

@Injectable()
export class TransportOperationsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TransportOperationsService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly noShowMinutes = Number(
    process.env.GOCAR_NO_SHOW_MINUTES ?? 120,
  );

  constructor(
    @Inject('TransportRepository')
    private readonly repository: TransportRepository,
    @Inject('TransportIntegrations')
    private readonly integrations: TransportIntegrations,
    private readonly transport: TransportService,
    private readonly staff: StaffService,
  ) {
    if (
      !Number.isInteger(this.noShowMinutes) ||
      this.noShowMinutes < 1 ||
      this.noShowMinutes > 1440
    ) {
      throw new Error('GOCAR_NO_SHOW_MINUTES phải từ 1 đến 1440');
    }
  }

  onModuleInit() {
    void this.reconcile();
    this.timer = setInterval(() => {
      void this.reconcile();
    }, 30_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async managedTrip(tripId: string, actorId: string) {
    await this.staff.verify(actorId, tripId, 'MANAGE_TRIP');
    const trip = await this.repository.findTrip(tripId);
    if (!trip) throw new NotFoundException();
    return trip;
  }
  async publish(tripId: string, actorId: string) {
    const trip = await this.managedTrip(tripId, actorId);
    return this.transport.publish(tripId, trip.operatorUserId, actorId);
  }
  async stopSale(tripId: string, actorId: string) {
    const trip = await this.managedTrip(tripId, actorId);
    return this.transport.stopSale(tripId, trip.operatorUserId, actorId);
  }
  async cancelTrip(tripId: string, actorId: string, reason: string) {
    const trip = await this.managedTrip(tripId, actorId);
    return this.transport.requestTripCancellation(
      tripId,
      trip.operatorUserId,
      reason,
      actorId,
    );
  }

  async adminSummary(tripId: string) {
    const trip = await this.repository.findTrip(tripId);
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');
    return {
      tripId: trip.id, origin: trip.origin, destination: trip.destination,
      departureAt: trip.departureAt, arrivalAt: trip.arrivalAt, status: trip.status,
      vehicle: trip.vehicle, operator: trip.operatorProfile,
      cancellationRequested: await this.repository.hasTripCancellation(tripId),
    };
  }

  async adminCancel(tripId: string, actorId: string, reason: string) {
    const trip = await this.repository.findTrip(tripId);
    if (!trip) throw new NotFoundException();
    return this.transport.requestTripCancellation(
      tripId,
      trip.operatorUserId,
      reason,
      actorId,
    );
  }

  async adminLifecycle(
    tripId: string,
    actorId: string,
    status: 'DEPARTED' | 'COMPLETED',
  ) {
    await this.repository.transitionTrip(tripId, actorId, status);
    await this.transport.synchronizeSale(tripId);
    return {
      tripId,
      status,
      inventorySyncPending:
        (await this.repository.findTrip(tripId))?.inventorySyncPending ?? true,
    };
  }

  async lifecycle(
    tripId: string,
    actorId: string,
    status: 'DEPARTED' | 'COMPLETED',
  ) {
    await this.staff.verify(actorId, tripId, 'MANAGE_TRIP');
    await this.repository.transitionTrip(tripId, actorId, status);
    await this.transport.synchronizeSale(tripId);
    return {
      tripId,
      status,
      inventorySyncPending:
        (await this.repository.findTrip(tripId))?.inventorySyncPending ?? true,
    };
  }

  async manifest(tripId: string, actorId: string) {
    await this.staff.verify(actorId, tripId, 'CHECK_IN');
    const trip = await this.repository.findTrip(tripId);
    if (!trip) throw new NotFoundException();
    return {
      tripId,
      status: trip.status,
      departureAt: trip.departureAt,
      stops: trip.stops,
      passengers: (await this.repository.manifest(tripId)).map((ticket) => ({
        ...ticket,
        seat: trip.seats.find((seat) => seat.id === ticket.seatId),
      })),
    };
  }

  async managedSeatMap(tripId: string, actorId: string) {
    const trip = await this.managedTrip(tripId, actorId);
    // Drafts have templates, not live inventory. Do not advertise bookable seats.
    if (trip.status === 'DRAFT') return [];
    const statuses = await this.integrations.getSeatStatus(tripId);
    const geometry = new Map(trip.seats.map((seat) => [seat.id, seat]));
    return statuses.map((seat) => ({
      ...geometry.get(seat.seatId),
      ...seat,
      priceVnd: trip.classPrices?.[geometry.get(seat.seatId)?.seatClass ?? ''] ?? trip.priceVnd,
    }));
  }

  async noShow(tripId: string, ticketId: string, actorId: string) {
    await this.staff.verify(actorId, tripId, 'CHECK_IN');
    await this.repository.markNoShow(
      ticketId,
      tripId,
      actorId,
      this.noShowMinutes,
    );
    return { ticketId, status: 'NO_SHOW' };
  }

  async pricing(
    tripId: string,
    actorId: string,
    prices: Record<string, string>,
  ) {
    await this.staff.verify(actorId, tripId, 'MANAGE_TRIP');
    if (
      !prices ||
      Array.isArray(prices) ||
      Object.keys(prices).length > 20 ||
      Object.entries(prices).some(
        ([name, amount]) =>
          !/^[A-Z0-9_]{1,32}$/.test(name) ||
          typeof amount !== 'string' ||
          !/^[1-9]\d{0,17}$/.test(amount),
      )
    ) {
      throw new BadRequestException(
        'Giá theo hạng ghế phải là số nguyên VND dạng chuỗi',
      );
    }
    await this.repository.updateClassPrices(tripId, actorId, prices);
    return { tripId, classPrices: prices };
  }

  async blockSeats(
    tripId: string,
    actorId: string,
    seats: string[],
    blocked: boolean,
    reason: string,
  ) {
    await this.staff.verify(actorId, tripId, 'MANAGE_TRIP');
    if (!reason?.trim() || reason.length > 500)
      throw new BadRequestException('Cần lý do chặn/mở ghế');
    await this.integrations.changeSeatBlock(
      tripId,
      seats,
      blocked,
      actorId,
      reason.trim(),
    );
    return { tripId, seatIds: seats, blocked };
  }

  async tripState(tripId: string) {
    const trip = await this.repository.findTrip(tripId);
    if (!trip) throw new NotFoundException();
    return {
      tripId,
      operatorId: trip.operatorId,
      status: trip.status,
      arrivalAt: trip.arrivalAt,
      departureAt: trip.departureAt,
      tickets: await this.repository.manifest(tripId),
    };
  }

  async reconcile() {
    if (this.running) return;
    this.running = true;
    try {
      await this.closeElapsedSales();
      for (const id of await this.repository.pendingInventorySync()) {
        try {
          await this.transport.synchronizeSale(id);
        } catch (error) {
          this.logger.warn(`Inventory sync ${id} retained for retry: ${String(error)}`);
        }
      }
      for (const trip of await this.repository.pendingPublications()) {
        try {
          await this.transport.publish(trip.id, trip.operatorUserId, 'SYSTEM');
        } catch (error) {
          this.logger.warn(
            `Publication ${trip.id} retained for retry: ${String(error)}`,
          );
        }
      }
      for (const tripId of await this.repository.pendingCompletions()) {
        try {
          const tickets = await this.repository.manifest(tripId);
          for (const ticket of tickets.filter(
            (item) => item.status === 'ACTIVE',
          )) {
            await this.repository.markNoShow(
              ticket.ticketId,
              tripId,
              'SYSTEM',
              this.noShowMinutes,
            );
          }
          await this.integrations.completeTrip(tripId);
          await this.repository.markCompletionSynced(tripId);
        } catch (error) {
          this.logger.warn(
            `Completion ${tripId} retained for retry: ${String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Transport operations worker failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }

  async closeElapsedSales(): Promise<void> {
    await this.repository.stopSalesAtDeparture();
  }
}
