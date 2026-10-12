import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  StaffRepository,
  StaffCapability,
  StaffScope,
} from '../domain/staff.repository';

@Injectable()
export class PrismaStaffRepository implements StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(
    ownerUserId: string,
    staffUserId: string,
    canSellCash: boolean,
    canCheckIn: boolean,
    active: boolean,
    scope: StaffScope = {},
  ) {
    const operator = await this.prisma.operator.findFirst({
      where: { userId: ownerUserId },
    });
    if (!operator)
      throw new NotFoundException('Không có nhà xe thuộc tài khoản');
    if (scope.tripIds?.length) {
      const count = await this.prisma.trip.count({
        where: { id: { in: scope.tripIds }, operatorId: operator.id },
      });
      if (count !== new Set(scope.tripIds).size)
        throw new NotFoundException('Chuyến không thuộc nhà xe');
    }
    const permissions = {
      canManageTrip: scope.canManageTrip ?? false,
      canCloseShift: scope.canCloseShift ?? false,
      tripIds: scope.tripIds ?? [],
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.operatorStaff.upsert({
        where: {
          operatorId_userId: { operatorId: operator.id, userId: staffUserId },
        },
        create: {
          operatorId: operator.id,
          userId: staffUserId,
          canSellCash,
          canCheckIn,
          active,
          assignedBy: ownerUserId,
          ...permissions,
        },
        update: {
          canSellCash,
          canCheckIn,
          active,
          assignedBy: ownerUserId,
          ...permissions,
        },
      });
      await tx.transportAudit.create({
        data: {
          actorId: ownerUserId,
          action: 'ASSIGN_STAFF',
          detail: {
            operatorId: operator.id,
            staffUserId,
            canSellCash,
            canCheckIn,
            active,
            ...permissions,
          },
        },
      });
    });
    return { operatorId: operator.id, staffUserId };
  }

  async authorizeOperator(
    actorId: string,
    operatorId: string,
    capability: StaffCapability,
  ) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
    });
    if (!operator) return null;
    if (operator.userId === actorId)
      return { operatorId, ownerUserId: operator.userId };
    const staff = (await this.prisma.operatorStaff.findUnique({
      where: {
        operatorId_userId: { operatorId, userId: actorId },
      },
    })) as any;
    const allowed =
      staff?.active &&
      (capability === 'CLOSE_SHIFT'
        ? staff.canCloseShift
        : capability === 'SELL_CASH'
          ? staff.canSellCash
          : capability === 'CHECK_IN'
            ? staff.canCheckIn
            : staff.canManageTrip);
    return allowed ? { operatorId, ownerUserId: operator.userId } : null;
  }

  async authorize(
    actorId: string,
    tripId: string,
    capability: StaffCapability,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { operator: true },
    });
    if (
      !trip ||
      ![
        'DRAFT',
        'PUBLISHING',
        'ON_SALE',
        'STOP_SALE',
        'DEPARTED',
        'COMPLETED',
      ].includes(trip.status)
    )
      return null;
    if (trip.operator.userId === actorId) {
      return { operatorId: trip.operatorId, ownerUserId: trip.operator.userId };
    }
    const staff = (await this.prisma.operatorStaff.findUnique({
      where: {
        operatorId_userId: { operatorId: trip.operatorId, userId: actorId },
      },
    })) as any;
    if (
      !staff?.active ||
      (capability === 'SELL_CASH' && !staff.canSellCash) ||
      (capability === 'CHECK_IN' && !staff.canCheckIn) ||
      (capability === 'MANAGE_TRIP' && !staff.canManageTrip) ||
      (capability === 'CLOSE_SHIFT' && !staff.canCloseShift) ||
      (staff.tripIds &&
        staff.tripIds.length > 0 &&
        !staff.tripIds.includes(tripId))
    )
      return null;
    return { operatorId: trip.operatorId, ownerUserId: trip.operator.userId };
  }

  async listByOperator(ownerUserId: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { userId: ownerUserId },
    });
    if (!operator)
      throw new NotFoundException('Không có nhà xe thuộc tài khoản');
    return this.prisma.operatorStaff.findMany({
      where: { operatorId: operator.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssignmentsForStaff(staffUserId: string) {
    return this.prisma.operatorStaff.findMany({
      where: { userId: staffUserId, active: true },
      include: {
        operator: { select: { id: true, name: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssignedTripsForStaff(staffUserId: string) {
    const assignments = await this.prisma.operatorStaff.findMany({
      where: { userId: staffUserId, active: true },
    });
    if (assignments.length === 0) return [];

    const tripQueries = assignments.map(async (rawAssign) => {
      const assign = rawAssign as any;
      if (assign.tripIds && assign.tripIds.length > 0) {
        return this.prisma.trip.findMany({
          where: { id: { in: assign.tripIds }, operatorId: assign.operatorId },
          include: { route: true, car: true },
          orderBy: { departureTime: 'asc' },
        });
      } else {
        return this.prisma.trip.findMany({
          where: {
            operatorId: assign.operatorId,
            status: { in: ['PUBLISHING', 'ON_SALE', 'STOP_SALE', 'DEPARTED'] },
            departureTime: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
          },
          include: { route: true, car: true },
          orderBy: { departureTime: 'asc' },
        });
      }
    });

    const results = await Promise.all(tripQueries);
    return results.flat();
  }

  async getOperatorByOwnerUserId(ownerUserId: string) {
    return this.prisma.operator.findFirst({ where: { userId: ownerUserId } });
  }

  async getStaffRecord(actorId: string, operatorId?: string) {
    const where: any = { userId: actorId, active: true };
    if (operatorId) where.operatorId = operatorId;
    return this.prisma.operatorStaff.findFirst({
      where,
      include: { operator: true },
    });
  }
}
