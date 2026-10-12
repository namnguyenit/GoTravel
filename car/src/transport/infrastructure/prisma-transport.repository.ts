import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { TripMapper } from '../../trip/infrastructure/mapper/trip.mapper';
import { TripStatus } from '../../trip/domain/value-object/trip-status.enum';
import { PrismaService } from '../../prisma/prisma.service';
import type { TransportRepository } from '../domain/transport.repository';
import type {
  PassengerSeat,
  TicketForCheckIn,
  SeatTemplate,
  TicketReceipt,
  TransportTrip,
  RouteStop,
} from '../domain/transport.types';
import {
  ticketToken,
  ticketTokenHash,
  verifyTicketToken,
} from './ticket-token';

@Injectable()
export class PrismaTransportRepository implements TransportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async pendingInventorySync() {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM trips WHERE offer_listing_id IS NOT NULL
      AND inventory_sync_version <> inventory_synced_version ORDER BY updated_at LIMIT 50`;
    return rows.map((row) => row.id);
  }

  async synchronizeInventory(
    tripId: string,
    apply: (
      enabled: boolean,
      version: number,
    ) => Promise<{ saleEnabled: boolean; syncVersion: number } | void>,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { cancellation: true },
    });
    if (
      !trip ||
      !trip.offerListingId ||
      trip.inventorySyncVersion === trip.inventorySyncedVersion
    )
      return;

    const targetVersion = trip.inventorySyncVersion;
    const targetEnabled =
      trip.status === 'ON_SALE' &&
      !trip.cancellation &&
      trip.departureTime > new Date();

    const ack = await apply(targetEnabled, targetVersion);
    if (
      !ack ||
      ack.syncVersion !== targetVersion ||
      ack.saleEnabled !== targetEnabled
    ) {
      throw new ConflictException(
        'Inventory chưa xác nhận đúng version và trạng thái bán',
      );
    }

    await this.prisma.trip.updateMany({
      where: {
        id: tripId,
        inventorySyncVersion: targetVersion,
      },
      data: {
        inventorySyncedVersion: targetVersion,
      },
    });
  }

  async transitionTrip(
    tripId: string,
    actorId: string,
    status: 'DEPARTED' | 'COMPLETED',
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException();
      if (trip.status === status) return;
      if (await tx.tripCancellation.findUnique({ where: { tripId } }))
        throw new ConflictException(
          'Chuyến đang hủy, không thể xuất bến/kết thúc',
        );
      const domain = TripMapper.toDomain(trip);
      try {
        domain.changeStatus(status as TripStatus);
      } catch (error) {
        throw new ConflictException(String(error));
      }
      await tx.trip.update({
        where: { id: tripId },
        data: { status, inventorySyncVersion: { increment: 1 } },
      });
      await tx.transportAudit.create({
        data: { actorId, tripId, action: status, detail: {} },
      });
    });
  }

  async pendingPublications() {
    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'PUBLISHING',
        OR: [{ publishRetryAt: null }, { publishRetryAt: { lte: new Date() } }],
      },
      include: { operator: true },
      orderBy: { updatedAt: 'asc' },
      take: 25,
    });
    return trips.map((trip) => ({
      id: trip.id,
      operatorUserId: trip.operator.userId,
    }));
  }

  async recordPublicationFailure(tripId: string, message: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.status !== 'PUBLISHING') return;
      const attempts = trip.publishAttempts + 1;
      await tx.trip.update({
        where: { id: tripId },
        data: {
          publishAttempts: attempts,
          publishError: message.slice(0, 500),
          publishRetryAt: new Date(
            Date.now() + Math.min(600_000, 30_000 * 2 ** Math.min(attempts, 5)),
          ),
        },
      });
    });
  }

  async pendingCompletions() {
    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        completionSyncedAt: null,
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    return trips.map((trip) => trip.id);
  }

  async markCompletionSynced(tripId: string) {
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { completionSyncedAt: new Date() },
    });
  }

  async updateClassPrices(
    tripId: string,
    actorId: string,
    prices: Record<string, string>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          car: { include: { seatTemplates: true } },
        },
      });
      if (!trip || trip.status !== 'DRAFT')
        throw new ConflictException('Chỉ sửa giá chuyến nháp');
      const activeSeats = trip.car.seatTemplates.filter((seat) => seat.active);
      if (activeSeats.length === 0)
        throw new BadRequestException('Xe không có ghế đang hoạt động');
      const activeClasses = new Set(activeSeats.map((seat) => seat.seatClass));
      if (Object.keys(prices).some((name) => !activeClasses.has(name))) {
        throw new BadRequestException(
          'Hạng ghế không có trong các ghế đang hoạt động của xe',
        );
      }
      const activeSeatPrices = activeSeats.map((seat) => {
        const override = prices[seat.seatClass];
        return BigInt(override ?? trip.priceVnd!.toString());
      });
      const actualMinimum = activeSeatPrices.reduce((min, cur) =>
        cur < min ? cur : min,
      );
      await tx.trip.update({
        where: { id: tripId },
        data: {
          classPrices: prices,
          searchPriceVnd: new Prisma.Decimal(actualMinimum.toString()),
        },
      });
      await tx.transportAudit.create({
        data: { actorId, tripId, action: 'SET_CLASS_PRICES', detail: prices },
      });
    });
  }

  async manifest(tripId: string) {
    const tickets = await this.prisma.issuedTicket.findMany({
      where: { tripId },
      orderBy: [{ seatId: 'asc' }, { createdAt: 'asc' }],
    });
    return tickets.map((ticket) => ({
      ticketId: ticket.id,
      orderId: ticket.orderId,
      orderItemId: ticket.orderItemId,
      seatId: ticket.seatId,
      passengerName: ticket.passengerName,
      pickupStopId: ticket.pickupStopId,
      dropoffStopId: ticket.dropoffStopId,
      status: ticket.status,
      revision: ticket.revision,
      checkedInAt: ticket.checkedInAt,
    }));
  }

  async markNoShow(
    ticketId: string,
    tripId: string,
    actorId: string,
    thresholdMinutes: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (
        !trip ||
        !['DEPARTED', 'COMPLETED'].includes(trip.status) ||
        Date.now() < trip.departureTime.getTime() + thresholdMinutes * 60_000
      ) {
        throw new ConflictException(
          'Chưa đến thời gian xác nhận khách không lên xe',
        );
      }
      const ticket = await tx.issuedTicket.findUnique({
        where: { id: ticketId },
      });
      if (!ticket || ticket.tripId !== tripId) throw new NotFoundException();
      if (
        await tx.transportItemOperation.findFirst({
          where: { ticketId, status: 'PREPARED' },
        })
      )
        throw new ConflictException('Vé đang đổi/hủy');
      if (ticket.status === 'NO_SHOW') return;
      if (ticket.status !== 'ACTIVE')
        throw new ConflictException('Vé đã hủy hoặc đã check-in');
      await tx.issuedTicket.update({
        where: { id: ticketId },
        data: { status: 'NO_SHOW' },
      });
      await tx.transportAudit.create({
        data: { actorId, tripId, action: 'NO_SHOW', detail: { ticketId } },
      });
    });
  }

  async saveQuote(
    id: string,
    tripId: string,
    version: string,
    hash: string,
    payload: Record<string, unknown>,
    expiresAt: Date,
  ) {
    await this.prisma.transportQuoteRecord.create({
      data: {
        id,
        tripId,
        version,
        hash,
        payload: payload as Prisma.InputJsonValue,
        expiresAt,
      },
    });
  }

  async claimQuote(id: string, orderId: string, hash: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM transport_quotes WHERE id = ${id} FOR UPDATE`;
      const quote = await tx.transportQuoteRecord.findUnique({ where: { id } });
      if (
        !quote ||
        quote.hash !== hash ||
        (quote.orderId && quote.orderId !== orderId)
      ) {
        throw new ConflictException(
          'Báo giá không hợp lệ hoặc đã dùng cho đơn khác',
        );
      }
      if (quote.orderId === orderId) return;
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${quote.tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({
        where: { id: quote.tripId },
        include: {
          operator: true,
          route: { include: { stops: true } },
          car: { include: { seatTemplates: true } },
        },
      });
      if (
        !trip ||
        trip.status !== 'ON_SALE' ||
        quote.expiresAt <= new Date() ||
        this.toSnapshot(trip).version !== quote.version
      ) {
        throw new ConflictException(
          'Báo giá đã hết hạn hoặc chuyến đã thay đổi',
        );
      }
      await tx.transportQuoteRecord.update({
        where: { id },
        data: { orderId },
      });
    });
  }

  async requestTripCancellation(
    tripId: string,
    operatorUserId: string,
    reason: string,
    actorId = operatorUserId,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { operator: true },
      });
      if (!trip || trip.operator.userId !== operatorUserId)
        throw new NotFoundException();
      const prior = await tx.tripCancellation.findUnique({ where: { tripId } });
      if (prior) {
        if (prior.reason !== reason)
          throw new ConflictException('Chuyến đã có yêu cầu hủy khác');
        return;
      }
      if (
        !['ON_SALE', 'STOP_SALE'].includes(trip.status) ||
        trip.departureTime <= new Date()
      ) {
        throw new ConflictException(
          'Chuyến không thể hủy qua quy trình thông thường',
        );
      }
      await tx.tripCancellation.create({
        data: { tripId, requestedBy: actorId, reason },
      });
      await tx.trip.update({
        where: { id: tripId },
        data: { status: 'STOP_SALE', inventorySyncVersion: { increment: 1 } },
      });
      await tx.transportAudit.create({
        data: {
          actorId,
          tripId,
          action: 'REQUEST_CANCELLATION',
          detail: { reason },
        },
      });
    });
  }

  async pendingTripCancellations(): Promise<
    Array<{ tripId: string; reason: string }>
  > {
    return this.prisma.tripCancellation.findMany({
      where: { status: { not: 'COMPLETED' } },
      select: { tripId: true, reason: true },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
  }

  async markTripCancellationProgress(
    tripId: string,
    safeToCancel: boolean,
    completed: boolean,
    pendingOrders: number,
    pendingRefunds: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const cancellation = await tx.tripCancellation.findUnique({
        where: { tripId },
      });
      if (!cancellation)
        throw new NotFoundException('Không có yêu cầu hủy chuyến');
      if (safeToCancel) {
        const updated = await tx.trip.updateMany({
          where: { id: tripId, status: { in: ['STOP_SALE', 'CANCELLED'] } },
          data: { status: 'CANCELLED' },
        });
        if (updated.count !== 1)
          throw new ConflictException('Trạng thái chuyến đã đổi khi hủy');
      }
      await tx.tripCancellation.update({
        where: { tripId },
        data: {
          status: completed
            ? 'COMPLETED'
            : safeToCancel
              ? 'REFUND_PENDING'
              : 'PROCESSING',
          pendingOrders,
          pendingRefunds,
        },
      });
    });
  }

  async hasTripCancellation(tripId: string): Promise<boolean> {
    return !!(await this.prisma.tripCancellation.findUnique({
      where: { tripId },
      select: { tripId: true },
    }));
  }

  async orderTickets(orderId: string): Promise<
    Array<{
      ticketId: string;
      orderItemId: string;
      tripId: string;
      seatId: string;
      status: string;
    }>
  > {
    const tickets = await this.prisma.issuedTicket.findMany({
      where: { orderId },
      orderBy: { orderItemId: 'asc' },
    });
    return tickets.map((ticket) => ({
      ticketId: ticket.id,
      orderItemId: ticket.orderItemId,
      tripId: ticket.tripId,
      seatId: ticket.seatId,
      status: ticket.status,
    }));
  }

  async replaceSeatTemplate(
    carId: string,
    operatorUserId: string,
    seats: Array<{
      code: string;
      level: number;
      seatClass: string;
      row?: number;
      column?: number;
    }>,
  ): Promise<SeatTemplate[]> {
    return this.prisma.$transaction(async (tx) => {
      const car = await tx.car.findUnique({
        where: { id: carId },
        include: { operator: true },
      });
      if (!car || car.operator.userId !== operatorUserId)
        throw new NotFoundException('Không tìm thấy xe');
      if (seats.length !== car.totalSeats) {
        throw new BadRequestException('Số ghế phải đúng bằng tổng ghế của xe');
      }
      const used = await tx.trip.count({
        where: { carId, status: { not: 'CANCELLED' } },
      });
      if (used > 0)
        throw new ConflictException(
          'Xe đã gắn với chuyến; không thể đổi sơ đồ ghế',
        );
      await tx.seatTemplate.deleteMany({ where: { carId } });
      await tx.seatTemplate.createMany({
        data: seats.map((seat) => ({
          id: randomUUID(),
          carId,
          code: seat.code,
          level: seat.level,
          seatClass: seat.seatClass,
          row: seat.row ?? 0,
          column: seat.column ?? 0,
        })),
      });
      return (
        await tx.seatTemplate.findMany({
          where: { carId },
          orderBy: { code: 'asc' },
        })
      ).map((seat) => ({
        id: seat.id,
        code: seat.code,
        level: seat.level,
        seatClass: seat.seatClass,
        row: seat.row ?? 0,
        column: seat.column ?? 0,
      }));
    });
  }

  async prepareTrip(
    tripId: string,
    operatorUserId: string,
    actorId = operatorUserId,
  ): Promise<TransportTrip> {
    return this.prisma.$transaction(async (tx) => {
      const refs = await tx.trip.findUnique({ where: { id: tripId } });
      if (!refs) throw new NotFoundException();
      await tx.$queryRaw`SELECT id FROM cars WHERE id = ${refs.carId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM operators WHERE id = ${refs.operatorId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM routes WHERE id = ${refs.routeId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          operator: true,
          route: { include: { stops: true } },
          car: { include: { seatTemplates: true } },
        },
      });
      if (!trip || trip.operator.userId !== operatorUserId) {
        throw new NotFoundException('Không tìm thấy chuyến thuộc nhà xe');
      }
      if (trip.carId !== refs.carId || trip.routeId !== refs.routeId)
        throw new ConflictException('Chuyến vừa được sửa; thử lại');
      if (
        trip.operator.status !== 'ACTIVE' ||
        trip.car.status !== 'ACTIVE' ||
        trip.route.status !== 'ACTIVE'
      ) {
        throw new ConflictException(
          'Nhà xe, xe hoặc tuyến đang ngừng hoạt động',
        );
      }
      if (
        trip.departureTime <= new Date() ||
        (await tx.tripCancellation.findUnique({ where: { tripId } }))
      ) {
        throw new ConflictException('Chuyến đã hết hạn hoặc đang hủy');
      }
      if (
        trip.status === 'ON_SALE' ||
        (trip.status === 'PUBLISHING' && trip.saleSnapshot)
      )
        return this.toSnapshot(trip);
      if (trip.status === 'STOP_SALE' && trip.saleSnapshot) {
        if (trip.route.status !== 'ACTIVE' || trip.car.status !== 'ACTIVE')
          throw new ConflictException('Xe hoặc tuyến đang ngừng hoạt động');
        await tx.transportAudit.create({
          data: { actorId, tripId, action: 'RESUME_SALE', detail: {} },
        });
        const resumed = await tx.trip.update({
          where: { id: tripId },
          data: { status: 'PUBLISHING', publishRetryAt: new Date() },
        });
        return this.toSnapshot({ ...trip, ...resumed });
      }
      if (!['DRAFT', 'PUBLISHING'].includes(trip.status)) {
        throw new ConflictException('Trạng thái chuyến không cho mở bán');
      }
      if (
        trip.departureTime <= new Date() ||
        trip.route.status !== 'ACTIVE' ||
        trip.car.status !== 'ACTIVE' ||
        !trip.priceVnd ||
        trip.priceVnd.lessThanOrEqualTo(0) ||
        trip.car.seatTemplates.filter((seat) => seat.active).length !==
          trip.car.totalSeats ||
        trip.route.stops.length < 2
      ) {
        throw new ConflictException(
          'Chuyến thiếu giá, điểm dừng hoặc sơ đồ ghế hợp lệ',
        );
      }
      const snapshot = this.toSnapshot(trip);
      const frozen = JSON.parse(
        JSON.stringify(snapshot),
      ) as Prisma.InputJsonValue;
      await tx.transportAudit.create({
        data: { actorId, tripId, action: 'PUBLISH_SALE', detail: {} },
      });
      const prepared = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: 'PUBLISHING',
          saleSnapshot: frozen,
          publishRetryAt: new Date(),
        },
      });
      return this.toSnapshot({ ...trip, ...prepared });
    });
  }

  async markTripOnSale(tripId: string, listingId: string): Promise<void> {
    const changed = await this.prisma.trip.updateMany({
      where: { id: tripId, status: { in: ['PUBLISHING', 'ON_SALE'] } },
      data: {
        status: 'ON_SALE',
        offerListingId: listingId,
        publishError: null,
        publishRetryAt: null,
        inventorySyncVersion: { increment: 1 },
      },
    });
    if (changed.count !== 1)
      throw new ConflictException('Chuyến đã đổi trạng thái');
  }

  async markTripStopSale(
    tripId: string,
    operatorUserId: string,
    actorId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE`;
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { operator: true },
      });
      if (!trip || trip.operator.userId !== operatorUserId)
        throw new NotFoundException();
      if (!['ON_SALE', 'STOP_SALE'].includes(trip.status))
        throw new ConflictException('Chuyến không đang mở bán');
      await tx.trip.update({
        where: { id: tripId },
        data: {
          status: 'STOP_SALE',
          inventorySyncVersion: { increment: 1 },
        },
      });
      await tx.transportAudit.create({
        data: {
          actorId: actorId ?? operatorUserId,
          tripId,
          action: 'STOP_SALE',
          detail: {},
        },
      });
    });
  }

  async findTrip(tripId: string): Promise<TransportTrip | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        operator: true,
        route: { include: { stops: true } },
        car: { include: { seatTemplates: true } },
      },
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
      const cancellation = await tx.tripCancellation.findUnique({
        where: { tripId },
      });
      if (cancellation)
        throw new ConflictException('Chuyến đang hủy, không thể phát vé');
      const receipts: TicketReceipt[] = [];
      for (const item of items) {
        const prior = await tx.issuedTicket.findUnique({
          where: { orderItemId: item.orderItemId },
        });
        if (prior) {
          if (
            prior.orderId !== orderId ||
            prior.tripId !== tripId ||
            prior.seatId !== item.seatId ||
            prior.passengerName !== item.passengerName ||
            prior.pickupStopId !== item.pickupStopId ||
            prior.dropoffStopId !== item.dropoffStopId ||
            prior.status === 'VOID'
          ) {
            throw new ConflictException('Order item đã có vé khác');
          }
          receipts.push({
            orderItemId: item.orderItemId,
            ticketId: prior.id,
            checkInToken: ticketToken(
              prior.id,
              item.orderItemId,
              prior.tokenGeneration,
            ),
          });
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
        receipts.push({
          orderItemId: item.orderItemId,
          ticketId: ticket.id,
          checkInToken,
        });
      }
      return receipts;
    });
  }

  async voidTickets(
    orderId: string,
    tripId: string,
    orderItemIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${tripId} FOR UPDATE`;
      const tickets = await tx.issuedTicket.findMany({ where: { orderId } });
      const expected = new Set(orderItemIds);
      if (tickets.length === 0) return;
      if (
        tickets.length !== expected.size ||
        tickets.some(
          (ticket) =>
            !expected.has(ticket.orderItemId) ||
            ticket.tripId !== tripId ||
            ticket.status === 'CHECKED_IN' ||
            ticket.status === 'NO_SHOW',
        )
      ) {
        throw new ConflictException(
          'Vé đã check-in hoặc dữ liệu vé không khớp đơn',
        );
      }
      const active = tickets.filter(
        (ticket) => ticket.status === 'ACTIVE',
      ).length;
      const changed = await tx.issuedTicket.updateMany({
        where: { orderId, status: 'ACTIVE' },
        data: { status: 'VOID' },
      });
      if (changed.count !== active)
        throw new ConflictException('Vé đã đổi trạng thái khi hủy');
    });
  }

  async ticketForCheckIn(token: string): Promise<TicketForCheckIn> {
    const parts = verifyTicketToken(token);
    const ticket = await this.prisma.issuedTicket.findUnique({
      where: { id: parts.ticketId },
      include: { trip: true },
    });
    if (
      !ticket ||
      ticket.orderItemId !== parts.orderItemId ||
      ticket.tokenHash !== ticketTokenHash(token)
    ) {
      throw new NotFoundException('Không tìm thấy vé');
    }
    return {
      id: ticket.id,
      orderId: ticket.orderId,
      orderItemId: ticket.orderItemId,
      tripId: ticket.tripId,
      seatId: ticket.seatId,
      status: ticket.status,
      revision: ticket.revision,
      departureAt: ticket.trip.departureTime,
      tripStatus: ticket.trip.status,
    };
  }

  async markCheckedIn(
    ticketId: string,
    actorId: string,
    expected: TicketForCheckIn,
    token: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.issuedTicket.findUnique({
        where: { id: ticketId },
      });
      if (!ticket) throw new NotFoundException('Không có vé');
      await tx.$queryRaw`SELECT "id" FROM "trips" WHERE "id" = ${ticket.tripId} FOR UPDATE`;
      const cancellation = await tx.tripCancellation.findUnique({
        where: { tripId: ticket.tripId },
      });
      if (cancellation)
        throw new ConflictException('Chuyến đang hủy, không thể check-in');
      if (
        await tx.transportItemOperation.findFirst({
          where: { ticketId, status: 'PREPARED' },
        })
      )
        throw new ConflictException('Vé đang đổi/hủy');
      await tx.$queryRaw`SELECT id FROM issued_tickets WHERE id=${ticketId} FOR UPDATE`;
      const locked = await tx.issuedTicket.findUnique({
        where: { id: ticketId },
      });
      if (
        !locked ||
        locked.tripId !== expected.tripId ||
        locked.seatId !== expected.seatId ||
        locked.revision !== expected.revision ||
        locked.tokenHash !== ticketTokenHash(token)
      )
        throw new ConflictException(
          'Vé vừa được thay đổi; dùng mã QR hiện tại',
        );
      const changed = await tx.issuedTicket.updateMany({
        where: { id: ticketId, status: 'ACTIVE' },
        data: {
          status: 'CHECKED_IN',
          checkedInAt: new Date(),
          checkedInBy: actorId,
        },
      });
      if (changed.count === 1) return;
      const current = await tx.issuedTicket.findUnique({
        where: { id: ticketId },
      });
      if (current?.status === 'CHECKED_IN' && current.checkedInBy === actorId)
        return;
      throw new ConflictException('Vé đã hủy hoặc đã được check-in');
    });
  }

  async amendTicket(input: {
    commandId: string;
    orderId: string;
    orderItemId: string;
    ticketId: string;
    expectedRevision: number;
    payloadHash: string;
    passengerName: string;
    pickupStopId: string;
    dropoffStopId: string;
  }): Promise<{
    ticketId: string;
    revision: number;
    passengerName: string;
    pickupStopId: string;
    dropoffStopId: string;
  }> {
    const {
      commandId,
      orderId,
      orderItemId,
      ticketId,
      expectedRevision,
      payloadHash,
      passengerName,
      pickupStopId,
      dropoffStopId,
    } = input;

    if (
      !commandId ||
      !orderId ||
      !orderItemId ||
      !ticketId ||
      !payloadHash ||
      !passengerName?.trim() ||
      !pickupStopId ||
      !dropoffStopId ||
      expectedRevision < 1
    ) {
      throw new BadRequestException('Thông tin yêu cầu sửa vé không hợp lệ');
    }

    const canonical = `${orderId}:${orderItemId}:${ticketId}:${passengerName.trim()}:${pickupStopId}:${dropoffStopId}`;
    const calculatedHash = createHash('sha256').update(canonical).digest('hex');
    if (calculatedHash !== payloadHash) {
      throw new BadRequestException(
        'Mã hash payload không hợp lệ so với nội dung sửa',
      );
    }

    const existing = await (
      this.prisma as any
    ).transportTicketAmendment.findUnique({
      where: { commandId },
    });
    if (existing) {
      if (
        existing.ticketId !== ticketId ||
        existing.payloadHash !== payloadHash
      ) {
        throw new ConflictException(
          'Command ID đã được sử dụng cho yêu cầu khác',
        );
      }
      return existing.result;
    }

    return this.prisma.$transaction(async (tx) => {
      const refs = await tx.issuedTicket.findUnique({
        where: { id: ticketId },
      });
      if (!refs) throw new NotFoundException('Không tìm thấy vé');
      await tx.$queryRaw`SELECT id FROM trips WHERE id=${refs.tripId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM issued_tickets WHERE id = ${ticketId} FOR UPDATE`;

      const replay = await tx.transportTicketAmendment.findUnique({
        where: { commandId },
      });
      if (replay) {
        if (replay.payloadHash !== payloadHash || replay.ticketId !== ticketId)
          throw new ConflictException('Command đã được dùng');
        return replay.result as unknown as {
          ticketId: string;
          revision: number;
          passengerName: string;
          pickupStopId: string;
          dropoffStopId: string;
        };
      }
      const ticket = await (tx as any).issuedTicket.findUnique({
        where: { id: ticketId },
        include: { trip: { include: { route: { include: { stops: true } } } } },
      });
      if (!ticket) throw new NotFoundException('Không tìm thấy vé');

      if (
        ticket.tripId !== refs.tripId ||
        (await tx.tripCancellation.findUnique({
          where: { tripId: ticket.tripId },
        }))
      )
        throw new ConflictException('Vé vừa đổi chuyến hoặc chuyến đang hủy');
      if (ticket.orderId !== orderId || ticket.orderItemId !== orderItemId) {
        throw new ConflictException(
          'Vé không thuộc đơn hàng hoặc item tương ứng',
        );
      }

      if (
        await tx.transportItemOperation.findFirst({
          where: { ticketId, status: 'PREPARED' },
        })
      )
        throw new ConflictException('Vé đang đổi/hủy');
      if (ticket.revision !== expectedRevision) {
        throw new ConflictException(
          `Revision của vé không khớp (hiện tại: ${ticket.revision}, yêu cầu: ${expectedRevision})`,
        );
      }

      if (['VOID', 'CHECKED_IN', 'NO_SHOW'].includes(ticket.status)) {
        throw new ConflictException(
          `Không thể sửa vé ở trạng thái ${ticket.status}`,
        );
      }

      if (['CANCELLED', 'COMPLETED'].includes(ticket.trip.status)) {
        throw new ConflictException('Chuyến xe đã kết thúc hoặc bị hủy');
      }

      if (ticket.trip.departureTime <= new Date()) {
        throw new ConflictException(
          'Chuyến xe đã khởi hành, không thể sửa thông tin vé',
        );
      }

      const frozenStops =
        (ticket.trip.saleSnapshot as any)?.stops ?? ticket.trip.route.stops;
      const stopsMap = new Map((frozenStops || []).map((s: any) => [s.id, s]));
      const pickup = stopsMap.get(pickupStopId) as any;
      const dropoff = stopsMap.get(dropoffStopId) as any;

      if (!pickup || !dropoff || pickup.order >= dropoff.order) {
        throw new BadRequestException(
          'Điểm đón trả không hợp lệ hoặc thứ tự sai',
        );
      }
      if (pickup.pickupAllowed === false || dropoff.dropoffAllowed === false) {
        throw new BadRequestException('Điểm dừng không cho phép đón hoặc trả');
      }

      const nextRevision = ticket.revision + 1;
      await (tx as any).issuedTicket.update({
        where: { id: ticketId },
        data: {
          passengerName: passengerName.trim(),
          pickupStopId,
          dropoffStopId,
          revision: nextRevision,
        },
      });

      const result = {
        ticketId,
        revision: nextRevision,
        passengerName: passengerName.trim(),
        pickupStopId,
        dropoffStopId,
      };

      await (tx as any).transportTicketAmendment.create({
        data: {
          commandId,
          ticketId,
          orderItemId,
          orderId,
          revision: nextRevision,
          payloadHash,
          result,
        },
      });

      await (tx as any).transportAudit.create({
        data: {
          actorId: 'CART_COORDINATOR',
          tripId: ticket.tripId,
          action: 'AMEND_TICKET',
          detail: { commandId, ticketId, revision: nextRevision, payloadHash },
        },
      });

      return result;
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
    saleSnapshot?: Prisma.JsonValue | null;
    classPrices?: Prisma.JsonValue | null;
    operator: {
      userId: string;
      id?: string;
      name?: string;
      status?: string;
      displayName?: string | null;
      logoUrl?: string | null;
      contactPhone?: string | null;
    };
    route: {
      origin: string;
      destination: string;
      stops: Array<{ id: string; name: string; order: number }>;
    };
    car: {
      id?: string;
      name?: string;
      type?: string;
      licensePlate?: string;
      totalSeats: number;
      seatTemplates: Array<{
        id: string;
        code: string;
        level: number;
        seatClass: string;
        active: boolean;
        row?: number;
        column?: number;
      }>;
    };
  }): TransportTrip {
    if (
      trip.saleSnapshot &&
      typeof trip.saleSnapshot === 'object' &&
      !Array.isArray(trip.saleSnapshot) &&
      'priceVnd' in (trip.saleSnapshot as object) &&
      'seats' in (trip.saleSnapshot as object) &&
      Array.isArray((trip.saleSnapshot as any).seats) &&
      (trip.saleSnapshot as any).departureAt
    ) {
      const frozen = trip.saleSnapshot as unknown as TransportTrip;
      return {
        ...frozen,
        status: trip.status,
        offerListingId: trip.offerListingId,
        priceVnd: (frozen.priceVnd ?? trip.priceVnd?.toString() ?? null) as any,
        vehicle: frozen.vehicle ?? {
          id: trip.car.id!,
          name: trip.car.name!,
          type: trip.car.type!,
          licensePlate: trip.car.licensePlate!,
        },
        operatorProfile: frozen.operatorProfile ?? {
          id: trip.operatorId,
          name: trip.operator.displayName ?? trip.operator.name!,
          logoUrl: trip.operator.logoUrl ?? null,
          contactPhone: trip.operator.contactPhone ?? null,
        },
        operatorStatus: trip.operator.status,
        inventorySyncPending:
          (trip as any).inventorySyncVersion !==
          (trip as any).inventorySyncedVersion,
        departureAt: frozen.departureAt ? new Date(frozen.departureAt) : trip.departureTime,
        arrivalAt: frozen.arrivalAt ? new Date(frozen.arrivalAt) : trip.arrivalTime,
      };
    }
    let stops: RouteStop[] = [];
    const stopOverrides = (trip as any).stopOverrides;
    if (
      stopOverrides &&
      Array.isArray(stopOverrides) &&
      stopOverrides.length >= 2
    ) {
      const routeStopMap = new Map(trip.route.stops.map((s) => [s.id, s]));
      stops = stopOverrides
        .map((o: any) => {
          const routeStop = routeStopMap.get(o.routeStopId);
          return {
            id: o.routeStopId,
            name: routeStop?.name ?? '',
            order: o.order,
            scheduledAt: o.scheduledAt ?? undefined,
            pickupAllowed: o.pickupAllowed ?? o.type !== 'DROPOFF',
            dropoffAllowed: o.dropoffAllowed ?? o.type !== 'PICKUP',
            address: (routeStop as any)?.address ?? null,
            province: (routeStop as any)?.province ?? null,
          };
        })
        .sort((a, b) => a.order - b.order);
    } else {
      stops = trip.route.stops
        .map((stop) => ({
          id: stop.id,
          name: stop.name,
          order: stop.order,
          scheduledAt:
            stop.order === Math.min(...trip.route.stops.map((s) => s.order))
              ? trip.departureTime.toISOString()
              : stop.order === Math.max(...trip.route.stops.map((s) => s.order))
                ? trip.arrivalTime.toISOString()
                : undefined,
          pickupAllowed:
            stop.order !== Math.max(...trip.route.stops.map((s) => s.order)),
          dropoffAllowed:
            stop.order !== Math.min(...trip.route.stops.map((s) => s.order)),
          address: (stop as any)?.address ?? null,
          province: (stop as any)?.province ?? null,
        }))
        .sort((a, b) => a.order - b.order);
    }

    const snapshot: TransportTrip = {
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
      operatorStatus: trip.operator.status,
      inventorySyncPending:
        (trip as any).inventorySyncVersion !==
        (trip as any).inventorySyncedVersion,
      vehicle: {
        id: trip.car.id!,
        name: trip.car.name!,
        type: trip.car.type!,
        licensePlate: trip.car.licensePlate!,
      },
      operatorProfile: {
        id: trip.operatorId,
        name: trip.operator.displayName ?? trip.operator.name!,
        logoUrl: trip.operator.logoUrl ?? null,
        contactPhone: trip.operator.contactPhone ?? null,
      },
      totalSeats: trip.car.totalSeats,
      seats: trip.car.seatTemplates
        .filter((seat) => seat.active)
        .map((seat) => ({
          id: seat.id,
          code: seat.code,
          level: seat.level,
          seatClass: seat.seatClass,
          row: seat.row ?? 0,
          column: seat.column ?? 0,
        })),
      classPrices: (trip.classPrices as Record<string, string> | null) ?? {},
      stops,
    };
    snapshot.version = createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex');
    return snapshot;
  }
}
