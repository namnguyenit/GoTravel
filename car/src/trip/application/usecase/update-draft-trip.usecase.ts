import { StaffService } from '../../../staff/application/staff.service';
import { Inject, Injectable } from '@nestjs/common';
import type {
  IUpdateDraftTripUseCase,
  UpdateDraftTripInput,
} from '../port/update-draft-trip.usecase.interface';
@Injectable()
export class UpdateDraftTripUseCase implements IUpdateDraftTripUseCase {
  constructor(
    @Inject('DraftTripManagementPort')
    private readonly management: IUpdateDraftTripUseCase,
    private readonly staff: StaffService,
  ) {}
  async execute(input: UpdateDraftTripInput): Promise<any> {
    await this.staff.verify(input.userId, input.tripId, 'MANAGE_TRIP');
    return this.management.execute(input);
  }
}
