import { CarType } from '../../domain/value-object/car-type.enum';
import { Car } from '../../domain/entity/car.entity';

export interface UpdateCarInput {
  carId: string;
  userId: string;
  name?: string;
  type?: CarType;
  licensePlate?: string;
}

export interface IUpdateCarUseCase {
  execute(input: UpdateCarInput): Promise<Car>;
}
