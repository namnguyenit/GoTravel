import { CarStatus } from '../../domain/value-object/car-status.enum';
import { Car } from '../../domain/entity/car.entity';

export interface UpdateCarStatusInput {
  carId: string;
  userId: string;
  status: CarStatus;
}

export interface IUpdateCarStatusUseCase {
  execute(input: UpdateCarStatusInput): Promise<Car>;
}
