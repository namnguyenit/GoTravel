import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  IUpdateCarStatusUseCase,
  UpdateCarStatusInput,
} from '../port/update-car-status.usecase.interface';
import type { ICarRepository } from '../../domain/repository/car.repository.interface';
import { Car } from '../../domain/entity/car.entity';

@Injectable()
export class UpdateCarStatusUseCase implements IUpdateCarStatusUseCase {
  constructor(
    @Inject('ICarRepository')
    private readonly carRepository: ICarRepository,
  ) {}

  async execute(input: UpdateCarStatusInput): Promise<Car> {
    return this.carRepository.mutateOwned(
      input.carId,
      input.userId,
      (car) => car.changeStatus(input.status),
      input.status !== 'ACTIVE',
    );
  }
}
