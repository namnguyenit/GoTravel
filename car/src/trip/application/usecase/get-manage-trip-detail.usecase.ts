import { StaffService } from '../../../staff/application/staff.service';
import { Inject, Injectable } from '@nestjs/common';
import type { IGetManageTripDetailUseCase } from '../port/get-manage-trip-detail.usecase.interface';
@Injectable()
export class GetManageTripDetailUseCase implements IGetManageTripDetailUseCase {
  constructor(
    @Inject('ManageTripDetailPort')
    private readonly management: IGetManageTripDetailUseCase,
    private readonly staff: StaffService,
  ) {}
  async execute(tripId: string, userId: string): Promise<any> {
    await this.staff.verify(userId, tripId, 'MANAGE_TRIP');
    return this.management.execute(tripId, userId);
  }
}
