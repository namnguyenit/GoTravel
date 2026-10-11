import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { StaffRepository, StaffCapability } from '../domain/staff.repository';
import type { StaffAccountPort } from './staff-account.port';

@Injectable()
export class StaffService {
  constructor(
    @Inject('StaffRepository') private readonly staff: StaffRepository,
    @Inject('StaffAccountPort') private readonly accounts: StaffAccountPort,
  ) {}

  async assign(ownerUserId: string, staffUserId: string, canSellCash: boolean,
    canCheckIn: boolean, active: boolean) {
    if (!(await this.accounts.isActive(staffUserId))) {
      throw new ForbiddenException('Nhân viên không có tài khoản hoạt động');
    }
    return this.staff.assign(ownerUserId, staffUserId, canSellCash, canCheckIn, active);
  }

  async verify(actorId: string, tripId: string, capability: StaffCapability) {
    const assignment = await this.staff.authorize(actorId, tripId, capability);
    if (!assignment) throw new ForbiddenException('Nhân viên chưa được phân quyền cho chuyến');
    if (!(await this.accounts.isActive(actorId)) ||
        !(await this.accounts.isActive(assignment.ownerUserId))) {
      throw new ForbiddenException('Tài khoản nhân viên hoặc nhà xe không hoạt động');
    }
    return { actorId, tripId, operatorId: assignment.operatorId, capability };
  }
}
