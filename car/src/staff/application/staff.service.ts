import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  StaffRepository,
  StaffCapability,
  StaffScope,
} from '../domain/staff.repository';
import type { StaffAccountPort } from './staff-account.port';

@Injectable()
export class StaffService {
  constructor(
    @Inject('StaffRepository') private readonly staff: StaffRepository,
    @Inject('StaffAccountPort') private readonly accounts: StaffAccountPort,
  ) {}

  async assign(
    ownerUserId: string,
    staffUserId: string,
    canSellCash: boolean,
    canCheckIn: boolean,
    active: boolean,
    scope?: StaffScope,
  ) {
    if (!(await this.accounts.isApprovedVendor(ownerUserId))) {
      throw new ForbiddenException('Nhà xe chưa được phê duyệt hoặc đang bị khóa');
    }
    const ownerOperator = await this.staff.getOperatorByOwnerUserId(ownerUserId);
    if (!ownerOperator || ownerOperator.status !== 'ACTIVE') {
      throw new NotFoundException('Không có nhà xe thuộc tài khoản');
    }
    if (!(await this.accounts.isActive(staffUserId))) {
      throw new ForbiddenException('Nhân viên không có tài khoản hoạt động');
    }
    const assignment = await this.staff.assign(
      ownerUserId,
      staffUserId,
      canSellCash,
      canCheckIn,
      active,
      scope,
    );
    if (active && this.accounts.grantStaffRole) {
      await this.accounts.grantStaffRole(staffUserId);
    }
    return assignment;
  }

  async verifyOperator(
    actorId: string,
    operatorId: string,
    capability: StaffCapability,
  ) {
    const assignment = await this.staff.authorizeOperator(
      actorId,
      operatorId,
      capability,
    );
    if (
      !assignment ||
      !(await this.accounts.isActive(actorId)) ||
      !(await this.accounts.isApprovedVendor(assignment.ownerUserId))
    )
      throw new ForbiddenException('Không có quyền nhà xe');
    return { actorId, operatorId, capability };
  }

  async verify(actorId: string, tripId: string, capability: StaffCapability) {
    const assignment = await this.staff.authorize(actorId, tripId, capability);
    if (!assignment)
      throw new ForbiddenException('Nhân viên chưa được phân quyền cho chuyến');
    if (
      !(await this.accounts.isActive(actorId)) ||
      !(await this.accounts.isApprovedVendor(assignment.ownerUserId))
    ) {
      throw new ForbiddenException(
        'Tài khoản nhân viên hoặc nhà xe không hoạt động',
      );
    }
    return { actorId, tripId, operatorId: assignment.operatorId, capability };
  }

  async listStaff(ownerUserId: string) {
    if (!(await this.accounts.isApprovedVendor(ownerUserId))) {
      throw new ForbiddenException(
        'Tài khoản nhà xe chưa được phê duyệt hoặc đang bị khóa',
      );
    }
    return this.staff.listByOperator(ownerUserId);
  }

  async getAssignmentsForStaff(staffUserId: string) {
    if (!(await this.accounts.isActive(staffUserId))) {
      throw new ForbiddenException('Tài khoản không hoạt động');
    }
    const assignments = await this.staff.getAssignmentsForStaff(staffUserId);
    const verified = await Promise.all(assignments.map(async (assignment: any) =>
      (await this.accounts.isApprovedVendor(assignment.operator.userId)) ? assignment : null,
    ));
    return verified.filter((assignment) => assignment !== null);
  }

  async getAssignedTripsForStaff(staffUserId: string) {
    if (!(await this.accounts.isActive(staffUserId))) {
      throw new ForbiddenException('Tài khoản không hoạt động');
    }
    const assignments = await this.getAssignmentsForStaff(staffUserId);
    const allowedOperators = new Set(assignments.map((assignment: any) => assignment.operatorId));
    const trips = await this.staff.getAssignedTripsForStaff(staffUserId);
    return trips.filter((trip: any) => allowedOperators.has(trip.operatorId));
  }

  async getReadScope(actorId: string, operatorId?: string) {
    const ownerOperator = await this.staff.getOperatorByOwnerUserId(actorId);
    if (ownerOperator && (!operatorId || ownerOperator.id === operatorId)) {
      if (ownerOperator.status !== 'ACTIVE' || !(await this.accounts.isApprovedVendor(actorId))) {
        throw new ForbiddenException(
          'Tài khoản nhà xe chưa được phê duyệt hoặc đang bị khóa',
        );
      }
      return {
        ownerUserId: actorId,
        operatorId: ownerOperator.id,
        allowedCapabilities: [
          'SELL_CASH',
          'CHECK_IN',
          'MANAGE_TRIP',
          'CLOSE_SHIFT',
          'CASH_VIEW',
        ],
        allowedTripIds: [],
        allTrips: true,
      };
    }

    const staff = await this.staff.getStaffRecord(actorId, operatorId);
    if (!staff || staff.operator.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Nhân viên không có quyền hoặc không thuộc nhà xe',
      );
    }

    if (
      !(await this.accounts.isActive(actorId)) ||
      !(await this.accounts.isApprovedVendor(staff.operator.userId))
    ) {
      throw new ForbiddenException(
        'Tài khoản nhân viên hoặc nhà xe không hoạt động',
      );
    }

    const allowedCapabilities: string[] = [];
    if (staff.canSellCash) allowedCapabilities.push('SELL_CASH');
    if (staff.canCheckIn) allowedCapabilities.push('CHECK_IN');
    if (staff.canManageTrip) allowedCapabilities.push('MANAGE_TRIP');
    if (staff.canCloseShift) {
      allowedCapabilities.push('CLOSE_SHIFT');
      allowedCapabilities.push('CASH_VIEW');
    }

    return {
      ownerUserId: staff.operator.userId,
      operatorId: staff.operatorId,
      allowedCapabilities,
      allowedTripIds: staff.tripIds || [],
      allTrips: !staff.tripIds || staff.tripIds.length === 0,
    };
  }
  async lookupStaff(ownerUserId: string, query: string) {
    if (!(await this.accounts.isApprovedVendor(ownerUserId))) {
      throw new ForbiddenException('Tài khoản nhà xe chưa được phê duyệt hoặc đang bị khóa');
    }
    return this.accounts.lookup(query);
  }
}
