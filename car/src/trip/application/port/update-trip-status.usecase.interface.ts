import { UpdateTripStatusInput } from '../dto/update-trip-status.input';
import { UpdateTripStatusOutput } from '../dto/update-trip-status.output';

export interface IUpdateTripStatusUseCase {
  execute(input: UpdateTripStatusInput): Promise<UpdateTripStatusOutput>;
}
