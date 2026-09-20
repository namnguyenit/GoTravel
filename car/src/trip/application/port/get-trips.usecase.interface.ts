import { GetTripsInput } from '../dto/get-trips.input';
import { GetTripsOutput } from '../dto/get-trips.output';

export interface IGetTripsUseCase {
  execute(input: GetTripsInput): Promise<GetTripsOutput>;
}
