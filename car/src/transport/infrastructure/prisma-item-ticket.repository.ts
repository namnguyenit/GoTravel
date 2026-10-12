import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ItemOperationPlan,
  ItemTicketRepository,
  ItemTicketResult,
} from '../domain/item-operation';
import { ticketToken, ticketTokenHash } from './ticket-token';
import { Prisma } from '@prisma/client';
@Injectable()
export class PrismaItemTicketRepository implements ItemTicketRepository {
  constructor(private readonly prisma: PrismaService) {}
  async apply(
    p: ItemOperationPlan,
    action: 'prepare' | 'commit' | 'abort',
  ): Promise<ItemTicketResult> {
    return this.prisma.$transaction(async (tx) => {
      // Same lock order as ticket check-in/void: trips sorted, then ticket, then operation.
      for (const tripId of [
        ...new Set([p.oldTripId, p.newTripId].filter(Boolean) as string[]),
      ].sort()) {
        await tx.$queryRaw`SELECT id FROM trips WHERE id=${tripId} FOR UPDATE`;
      }
      await tx.$queryRaw`SELECT id FROM issued_tickets WHERE id=${p.oldTicketId} FOR UPDATE`;
      const prior = await tx.transportItemOperation.findUnique({
        where: { id: p.operationId },
      });
      if (
        prior &&
        (prior.requestHash !== p.requestHash ||
          prior.ticketId !== p.oldTicketId)
      )
        throw new ConflictException('Operation payload khác');
      if (prior?.status === 'COMMITTED')
        return prior.result as unknown as ItemTicketResult;
      if (prior?.status === 'ABORTED')
        return { operationId: p.operationId, state: 'ABORTED' };
      const ticket = await tx.issuedTicket.findUnique({
        where: { id: p.oldTicketId },
        include: { trip: true },
      });
      if (
        !ticket ||
        ticket.orderId !== p.orderId ||
        ticket.orderItemId !== p.itemId
      )
        throw new NotFoundException();
      if (action === 'abort') {
        if (prior)
          await tx.transportItemOperation.update({
            where: { id: p.operationId },
            data: { status: 'ABORTED' },
          });
        else
          await tx.transportItemOperation.create({
            data: {
              id: p.operationId,
              ticketId: ticket.id,
              requestHash: p.requestHash,
              status: 'ABORTED',
              plan: p as unknown as Prisma.InputJsonValue,
            },
          });
        return { operationId: p.operationId, state: 'ABORTED' };
      }
      if (
        ticket.status !== 'ACTIVE' ||
        ticket.revision !== p.expectedRevision ||
        ticket.tripId !== p.oldTripId ||
        ticket.seatId !== p.oldSeatId
      )
        throw new ConflictException('Vé đã check-in/đổi/hủy');
      const busy = await tx.transportItemOperation.findFirst({
        where: {
          ticketId: ticket.id,
          status: 'PREPARED',
          id: { not: p.operationId },
        },
      });
      if (busy) throw new ConflictException('Vé có operation khác đang xử lý');
      const cancellation = p.forcedTripCancellation
        ? await tx.tripCancellation.findUnique({
            where: { tripId: p.oldTripId },
          })
        : null;
      if (p.forcedTripCancellation && (p.kind !== 'CANCEL' || !cancellation))
        throw new ConflictException(
          'Không có intent hủy chuyến để miễn phí hủy',
        );
      if (!prior) {
        if (
          !(p.kind === 'CANCEL' && p.forcedTripCancellation) &&
          (ticket.trip.departureTime <= new Date() ||
            ['CANCELLED', 'COMPLETED', 'DEPARTED'].includes(
              ticket.trip.status,
            ) ||
            (await tx.tripCancellation.findUnique({
              where: { tripId: ticket.tripId },
            })))
        )
          throw new ConflictException('Chuyến không cho đổi/hủy');
        await tx.transportItemOperation.create({
          data: {
            id: p.operationId,
            ticketId: ticket.id,
            requestHash: p.requestHash,
            status: 'PREPARED',
            plan: p as unknown as Prisma.InputJsonValue,
          },
        });
      }
      if (action === 'prepare')
        return { operationId: p.operationId, state: 'PREPARED' };
      const revision = ticket.revision + 1;
      const generation = ticket.tokenGeneration + 1;
      let token: string | undefined;
      if (p.kind === 'EXCHANGE') {
        const trip = await tx.trip.findUnique({
          where: { id: p.newTripId! },
          include: { operator: true },
        });
        if (
          !trip ||
          trip.operatorId !== ticket.trip.operatorId ||
          trip.status !== 'ON_SALE' ||
          trip.operator.status !== 'ACTIVE' ||
          trip.departureTime <= new Date() ||
          (await tx.tripCancellation.findUnique({ where: { tripId: trip.id } }))
        )
          throw new ConflictException('Chuyến thay thế đang hủy/kết thúc');
        const stops = (trip.saleSnapshot as any)?.stops ?? [];
        const pickup = stops.find((s: any) => s.id === p.pickupStopId);
        const dropoff = stops.find((s: any) => s.id === p.dropoffStopId);
        if (
          !pickup ||
          !dropoff ||
          pickup.order >= dropoff.order ||
          pickup.pickupAllowed === false ||
          dropoff.dropoffAllowed === false
        )
          throw new ConflictException('Điểm đón trả không khớp snapshot');
        token = ticketToken(ticket.id, ticket.orderItemId, generation);
        await tx.issuedTicket.update({
          where: { id: ticket.id },
          data: {
            tripId: trip.id,
            seatId: p.newSeatId!,
            passengerName: p.passengerName,
            pickupStopId: p.pickupStopId!,
            dropoffStopId: p.dropoffStopId!,
            revision,
            tokenGeneration: generation,
            tokenHash: ticketTokenHash(token),
          },
        });
      } else
        await tx.issuedTicket.update({
          where: { id: ticket.id },
          data: { status: 'VOID', revision, tokenGeneration: generation },
        });
      const result: ItemTicketResult = {
        operationId: p.operationId,
        state: 'COMMITTED',
        ticketId: ticket.id,
        revision,
        ...(token ? { checkInToken: token } : {}),
      };
      await tx.transportItemOperation.update({
        where: { id: p.operationId },
        data: {
          status: 'COMMITTED',
          previousTicket: JSON.parse(JSON.stringify(ticket)),
          result: result as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.transportAudit.create({
        data: {
          actorId: cancellation?.requestedBy ?? p.actorId,
          tripId: p.oldTripId,
          action: p.kind === 'CANCEL' ? 'CANCEL_ITEM' : 'EXCHANGE_ITEM',
          detail: { operationId: p.operationId, itemId: p.itemId, revision },
        },
      });
      return result;
    });
  }
}
