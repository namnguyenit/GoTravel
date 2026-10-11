import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { TransportRepository } from '../domain/transport.repository';
import type {
  PassengerSeat,
  TicketForCheckIn,
  SeatTemplate,
  TicketReceipt,
  TransportTrip,
} from '../domain/transport.types';
import { ticketToken, ticketTokenHash, verifyTicketToken } from './ticket-token';

@Injectable()
export class PrismaTransportRepository implements TransportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async requestTripCancellation(tripId: string, operatorUserId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { operator: true } });
      if (!trip || trip.operator.userId !== operatorUserId) throw new NotFoundException();
      const prior = await tx.tripCancellation.findUnique({ where: { tripId } });
      if (prior) {
        if (prior.reason !== reason) throw new ConflictException('Chuyến đã có yêu cầu hủy khác');
        return;
      }
      if (!['ON_SALE', 'STOP_SALE'].includes(trip.status) || trip.departureTime <= new Date()) {
        throw new ConflictException('Chuyến không thể hủy qua quy trình thông thường');
      }
      await tx.tripCancellation.create({
        data: { tripId, requestedBy: operatorUserId, reason },
      });
      await tx.trip.update({ where: { id: tripId }, data: { status: 'STOP_SALE' } });
    });
  }

  async pendingTripCancellations(): Promise<Array<{ tripId: string; reason: string }>> {
    return this.prisma.tripCancellation.findMany({
      where: { status: { not: 'COMPLETED' } },
      select: { tripId: true, reason: true },
      orderBy: { updatedAt: 'asc' }, take: 50,
    });
  }

  async markTripCancellationProgress(tripId: string, safeToCancel: boolean,
    completed: boolean, pendingOrders: number, pendingRefunds: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const cancellation = await tx.tripCancellation.findUnique({ where: { tripId } });
      if (!cancellation) throw new NotFoundException('Không có yêu cầu hủy chuyến');
      if (safeToCancel) {
        const updated = await tx.trip.updateMany({
          where: { id: tripId, status: { in: ['STOP_SALE', 'CANCELLED'] } },
          data: { status: 'CANCELLED' },
        });
        if (updated.count !== 1) throw new ConflictException('Trạng thái chuyến đã đổi khi hủy');
      }
      await tx.tripCancellation.update({ where: { tripId }, data: {
        status: completed ? 'COMPLETED' : safeToCancel ? 'REFUND_PENDING' : 'PROCESSING',
        pendingOrders, pendingRefunds,
      } });
    });
  }

  async hasTripCancellation(tripId: string): Promise<boolean> {
    return !!await this.prisma.tripCancellation.findUnique({ where: { tripId }, select: { tripId: true } });
  }

  async orderTickets(orderId: string): Promise<Array<{
    ticketId: string; orderItemId: string; tripId: string; seatId: string; status: string;
  }>> {
    const tickets = await this.prisma.issuedTicket.findMany({ where: { orderId },
      orderBy: { orderItemId: 'asc' } });
    return tickets.map((ticket) => ({ ticketId: ticket.id, orderItemId: ticket.orderItemId,
      tripId: ticket.tripId, seatId: ticket.seatId, status: ticket.status }));
  }

  async replaceSeatTemplate(
    carId: string,
    operatorUserId: string,
    seats: Array<{ code: string; level: number; seatClass: string }>,
  ): Promise<SeatTemplate[]> {
    return this.prisma.$transaction(async (tx) => {
      const car = await tx.car.findUnique({
        where: { id: carId },
        include: { operator: true },
      });
      if (!car || car.operator.userId !== operatorUserId) throw new NotFoundException('Không tìm thấy xe');
      if (seats.length !== car.totalSeats) {
        throw new BadRequestException('Số ghế phải đúng bằng tổng ghế của xe');
      }
      const used = await tx.trip.count({ where: { carId, status: { not: 'CANCELLED' } } });
      if (used > 0) throw new ConflictException('Xe đã gắn với chuyến; không thể đổi sơ đồ ghế');
      await tx.seatTemplate.deleteMany({ where: { carId } });
      await tx.seatTemplate.createMany({
        data: seats.map((seat) => ({
          id: randomUUID(),
          carId,
          code: seat.code,
          level: seat.level,
          seatClass: seat.seatClass,
        })),
      });
      return (await tx.seatTemplate.findMany({ where: { carId }, orderBy: { code: 'asc' } }))
        .map((seat) => ({
          id: seat.id,
          code: seat.code,
          level: seat.level,
          seatClass: seat.seatClass,
        }));
    });
  }

  async prepareTrip(tripId: string, operatorUserId: string): Promise<TransportTrip> {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { operator: true, route: { include: { stops: true } },
          car: { include: { seatTemplates: true } } },
      });
      if (!trip || trip.operator.userId !== operatorUserId) {
        throw new NotFoundException('Không tìm thấy chuyến thuộc nhà xe');
      }
      if (trip.status === 'ON_SALE') return this.toSnapshot(trip);
      if (!['DRAFT', 'PUBLISHING'].includes(trip.status)) {
        throw new ConflictException('Trạng thái chuyến không cho mở bán');
      }
      if (trip.departureTime <= new Date() || trip.route.status !== 'ACTIVE' ||
          trip.car.status !== 'ACTIVE' || !trip.priceVnd ||
          trip.priceVnd.lessThanOrEqualTo(0) ||
          trip.car.seatTemplates.filter((seat) => seat.active).length !== trip.car.totalSeats ||
          trip.route.stops.length < 2) {
        throw new ConflictException('Chuyến thiếu giá, điểm dừng hoặc sơ đồ ghế hợp lệ');
      }
      await tx.trip.update({ where: { id: tripId }, data: { status: 'PUBLISHING' } });
      return this.toSnapshot({ ...trip, status: 'PUBLISHING' });
    });
  }

  async markTripOnSale(tripId: string, listingId: string): Promise<void> {
    const changed = await this.prisma.trip.updateMany({
      where: { id: tripId, status: { in: ['PUBLISHING', 'ON_SALE'] } },
      data: { status: 'ON_SALE', offerListingId: listingId },
    });
    if (changed.count !== 1) throw new ConflictException('Chuyến đã đổi trạng thái');
  }

  async markTripStopSale(tripId: string, operatorUserId: string): Promise<void> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId }, include: { operator: true },
    });
    if (!trip || trip.operator.userId !== operatorUserId) throw new NotFoundException();
    if (trip.status !== 'ON_SALE' && trip.status !== 'STOP_SALE') {
      throw new ConflictException('Chuyến không đang mở bán');
    }
    await this.prisma.trip.update({ where: { id: tripId }, data: { status: 'STOP_SALE' } });
  }

  async findTrip(tripId: string): Promise<TransportTrip | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { operator: true, route: { include: { stops: true } },
        car: { include: { seatTemplates: true } } },
    });
    return trip ? this.toSnapshot(trip) : null;
  }

  async issueTickets(
    orderId: string,
    tripId: string,
    items: PassengerSeat[],
  ): Promise<TicketReceipt[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const cancellation = await tx.tripCancellation.findUnique({ where: { tripId } });
      if (cancellation) throw new ConflictException('Chuyến đang hủy, không thể phát vé');
      const receipts: TicketReceipt[] = [];
      for (const item of items) {
        const prior = await tx.issuedTicket.findUnique({ where: { orderItemId: item.orderItemId } });
        if (prior) {
          if (prior.orderId !== orderId || prior.tripId !== tripId || prior.seatId !== item.seatId ||
              prior.passengerName !== item.passengerName ||
              prior.pickupStopId !== item.pickupStopId || prior.dropoffStopId !== item.dropoffStopId ||
              prior.status === 'VOID') {
            throw new ConflictException('Order item đã có vé khác');
          }
          receipts.push({ orderItemId: item.orderItemId, ticketId: prior.id,
            checkInToken: ticketToken(prior.id, item.orderItemId) });
          continue;
        }
        const ticketId = randomUUID();
        const checkInToken = ticketToken(ticketId, item.orderItemId);
        const tokenHash = ticketTokenHash(checkInToken);
        const ticket = await tx.issuedTicket.create({
          data: {
            id: ticketId,
            orderId,
            orderItemId: item.orderItemId,
            tripId,
            seatId: item.seatId,
            passengerName: item.passengerName,
            pickupStopId: item.pickupStopId,
            dropoffStopId: item.dropoffStopId,
            tokenHash,
          },
        });
        receipts.push({ orderItemId: item.orderItemId, ticketId: ticket.id, checkInToken });
      }
      return receipts;
    });
  }

  async voidTickets(orderId: string, tripId: string, orderItemIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const tickets = await tx.issuedTicket.findMany({ where: { orderId } });
      const expected = new Set(orderItemIds);
      if (tickets.length === 0) return;
      if (tickets.length !== expected.size ||
          tickets.some((ticket) => !expected.has(ticket.orderItemId) ||
            ticket.tripId !== tripId || ticket.status === 'CHECKED_IN')) {
        throw new ConflictException('Vé đã check-in hoặc dữ liệu vé không khớp đơn');
      }
      const active = tickets.filter((ticket) => ticket.status === 'ACTIVE').length;
      const changed = await tx.issuedTicket.updateMany({
        where: { orderId, status: 'ACTIVE' },
        data: { status: 'VOID' },
      });
      if (changed.count !== active) throw new ConflictException('Vé đã đổi trạng thái khi hủy');
    });
  }

  async ticketForCheckIn(token: string): Promise<TicketForCheckIn> {
    const parts = verifyTicketToken(token);
    const ticket = await this.prisma.issuedTicket.findUnique({
      where: { id: parts.ticketId }, include: { trip: true },
    });
    if (!ticket || ticket.orderItemId !== parts.orderItemId ||
        ticket.tokenHash !== ticketTokenHash(token)) {
      throw new NotFoundException('Không tìm thấy vé');
    }
    return { id: ticket.id, orderId: ticket.orderId, orderItemId: ticket.orderItemId,
      tripId: ticket.tripId, status: ticket.status, departureAt: ticket.trip.departureTime };
  }

  async markCheckedIn(ticketId: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.issuedTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new NotFoundException('Không có vé');
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${ticket.tripId} FOR UPDATE`;
      const cancellation = await tx.tripCancellation.findUnique({ where: { tripId: ticket.tripId } });
      if (cancellation) throw new ConflictException('Chuyến đang hủy, không thể check-in');
      const changed = await tx.issuedTicket.updateMany({
        where: { id: ticketId, status: 'ACTIVE' },
        data: { status: 'CHECKED_IN', checkedInAt: new Date(), checkedInBy: actorId },
      });
      if (changed.count === 1) return;
      const current = await tx.issuedTicket.findUnique({ where: { id: ticketId } });
      if (current?.status === 'CHECKED_IN' && current.checkedInBy === actorId) return;
      throw new ConflictException('Vé đã hủy hoặc đã được check-in');
    });
  }

  private toSnapshot(trip: {
    id: string;
    operatorId: string;
    routeId: string;
    departureTime: Date;
    arrivalTime: Date;
    priceVnd: { toString(): string } | null;
    offerListingId: string | null;
    status: string;
    operator: { userId: string };
    route: { origin: string; destination: string; stops: Array<{ id: string; name: string; order: number }> };
    car: { totalSeats: number; seatTemplates: Array<{
      id: string; code: string; level: number; seatClass: string; active: boolean;
    }> };
  }): TransportTrip {
    return {
      id: trip.id,
      operatorId: trip.operatorId,
      operatorUserId: trip.operator.userId,
      routeId: trip.routeId,
      origin: trip.route.origin,
      destination: trip.route.destination,
      departureAt: trip.departureTime,
      arrivalAt: trip.arrivalTime,
      priceVnd: trip.priceVnd?.toString() ?? null,
      offerListingId: trip.offerListingId,
      status: trip.status,
      totalSeats: trip.car.totalSeats,
      seats: trip.car.seatTemplates.filter((seat) => seat.active)
        .map((seat) => ({
          id: seat.id, code: seat.code, level: seat.level, seatClass: seat.seatClass,
        })),
      stops: trip.route.stops.map((stop) => ({ id: stop.id, name: stop.name, order: stop.order })),
    };
  }
}
