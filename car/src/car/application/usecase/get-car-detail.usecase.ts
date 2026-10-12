import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { IGetCarDetailUseCase } from '../port/get-car-detail.usecase.interface';
import type {
  ICarRepository,
  CarDetailResult,
} from '../../domain/repository/car.repository.interface';

@Injectable()
export class GetCarDetailUseCase implements IGetCarDetailUseCase {
  constructor(
    @Inject('ICarRepository')
    private readonly carRepository: ICarRepository,
  ) {}

  async execute(carId: string, userId: string): Promise<CarDetailResult> {
    if (!carId || !carId.trim())
      throw new BadRequestException('Mã xe không hợp lệ');
    const operatorId = await this.carRepository.findOperatorIdByUserId(userId);
    if (!operatorId) {
      throw new ForbiddenException('Tài khoản chưa được liên kết với nhà xe');
    }
    const result = await this.carRepository.findByIdWithSeats(carId);
    if (!result || result.car.operatorId !== operatorId) {
      throw new NotFoundException('Không tìm thấy xe');
    }
    return result;
  }
}
