import { CarDetailResult } from '../../domain/repository/car.repository.interface';

export interface IGetCarDetailUseCase {
  execute(carId: string, userId: string): Promise<CarDetailResult>;
}
