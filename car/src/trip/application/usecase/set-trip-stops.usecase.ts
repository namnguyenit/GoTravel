import { StaffService } from '../../../staff/application/staff.service';
import { Inject, Injectable } from '@nestjs/common';
import type {
  ISetTripStopsUseCase,
  SetTripStopsInput,
} from '../port/set-trip-stops.usecase.interface';
@Injectable()
export class SetTripStopsUseCase implements ISetTripStopsUseCase {
  constructor(
    @Inject('TripStopsManagementPort')
    private readonly management: ISetTripStopsUseCase,
    private readonly staff: StaffService,
  ) {}
  async execute(input: SetTripStopsInput): Promise<any> {
    await this.staff.verify(input.userId, input.tripId, 'MANAGE_TRIP');
    return this.management.execute(input);
  }
}
