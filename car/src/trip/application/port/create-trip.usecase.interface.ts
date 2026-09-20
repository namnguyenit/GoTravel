import { CreateTripInput } from '../dto/create-trip.input';
import { CreateTripOutput } from '../dto/create-trip.output';

export interface ICreateTripUseCase {
  execute(input: CreateTripInput): Promise<CreateTripOutput>;
}
