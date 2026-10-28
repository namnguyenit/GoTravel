import { Inject, Injectable } from '@nestjs/common';
import type { ICarRepository } from '../../domain/repository/car.repository.interface';

@Injectable()
export class DeleteCarUseCase {
  constructor(@Inject('ICarRepository') private readonly cars: ICarRepository) {}

  async execute(carId: string, userId: string): Promise<void> {
    await this.cars.archiveOwned(carId, userId);
  }
}
