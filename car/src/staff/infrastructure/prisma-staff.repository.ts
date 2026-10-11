import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StaffRepository, StaffCapability } from '../domain/staff.repository';

@Injectable()
export class PrismaStaffRepository implements StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(ownerUserId: string, staffUserId: string, canSellCash: boolean,
    canCheckIn: boolean, active: boolean) {
    const operator = await this.prisma.operator.findFirst({ where: { userId: ownerUserId } });
    if (!operator) throw new NotFoundException('Không có nhà xe thuộc tài khoản');
    await this.prisma.operatorStaff.upsert({
      where: { operatorId_userId: { operatorId: operator.id, userId: staffUserId } },
      create: { operatorId: operator.id, userId: staffUserId, canSellCash,
        canCheckIn, active, assignedBy: ownerUserId },
      update: { canSellCash, canCheckIn, active, assignedBy: ownerUserId },
    });
    return { operatorId: operator.id, staffUserId };
  }

  async authorize(actorId: string, tripId: string, capability: StaffCapability) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId }, include: { operator: true },
    });
    if (!trip || !['PUBLISHING', 'ON_SALE', 'STOP_SALE', 'DEPARTED'].includes(trip.status)) return null;
    if (trip.operator.userId === actorId) {
      return { operatorId: trip.operatorId, ownerUserId: trip.operator.userId };
    }
    const staff = await this.prisma.operatorStaff.findUnique({
      where: { operatorId_userId: { operatorId: trip.operatorId, userId: actorId } },
    });
    if (!staff?.active || (capability === 'SELL_CASH' && !staff.canSellCash) ||
        (capability === 'CHECK_IN' && !staff.canCheckIn)) return null;
    return { operatorId: trip.operatorId, ownerUserId: trip.operator.userId };
  }
}
