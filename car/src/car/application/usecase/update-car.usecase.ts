import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  IUpdateCarUseCase,
  UpdateCarInput,
} from '../port/update-car.usecase.interface';
import type { ICarRepository } from '../../domain/repository/car.repository.interface';
import { Car } from '../../domain/entity/car.entity';

@Injectable()
export class UpdateCarUseCase implements IUpdateCarUseCase {
  constructor(
    @Inject('ICarRepository')
    private readonly carRepository: ICarRepository,
  ) {}

  async execute(input: UpdateCarInput): Promise<Car> {
    return this.carRepository.mutateOwned(
      input.carId,
      input.userId,
      (car) => car.updateInfo(input.name, input.type, input.licensePlate),
      true,
    );
  }
}
