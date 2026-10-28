import { Inject, Injectable, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IAddCarUseCase } from '../port/add-car.usecase.interface';
import { AddCarInput } from '../dto/add-car.input';
import { AddCarOutput } from '../dto/add-car.output';
import type { ICarRepository } from '../../domain/repository/car.repository.interface';
import { Car } from '../../domain/entity/car.entity';
import { LicensePlate } from '../../domain/value-object/license-plate.vo';

@Injectable()
export class AddCarUseCase implements IAddCarUseCase {
  constructor(
    @Inject('ICarRepository')
    private readonly carRepository: ICarRepository,
  ) {}

  async execute(input: AddCarInput): Promise<AddCarOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã người dùng (userId).');
    }

    // 1. Kiểm tra / lấy Operator ID thuộc sở hữu của User (Bắt buộc tài khoản đã được Admin duyệt thành Nhà xe)
    const operatorId = await this.carRepository.findOperatorIdByUserId(input.userId);
    if (!operatorId) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt trước khi thêm xe.',
      );
    }

    // 2. Validate định dạng biển số xe trước khi query
    let licensePlateVo: LicensePlate;
    try {
      licensePlateVo = new LicensePlate(input.licensePlate);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    // 3. Kiểm tra biển số xe đã tồn tại hay chưa (Business Rule: Biển số xe duy nhất)
    const existingCar = await this.carRepository.findByLicensePlate(licensePlateVo.getValue());
    if (existingCar) {
      throw new ConflictException('Biển số xe đã tồn tại trong hệ thống, vui lòng kiểm tra lại.');
    }

    // 4. Khởi tạo Domain Entity (Tự động validate name 3-100 ký tự, totalSeats > 0)
    let carEntity: Car;
    try {
      carEntity = Car.create({
        operatorId,
        name: input.name,
        type: input.type,
        licensePlate: licensePlateVo,
        totalSeats: input.totalSeats,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    // 5. Lưu Entity thông qua Repository contract
    const deckCount = input.deckCount ?? (input.type === 'SLEEPER' && input.totalSeats > 1 ? 2 : 1);
    const lowerDeckSeats = deckCount === 1 ? input.totalSeats : input.lowerDeckSeats ?? Math.ceil(input.totalSeats / 2);
    if (![1, 2].includes(deckCount) || lowerDeckSeats < 1 ||
        (deckCount === 2 && lowerDeckSeats >= input.totalSeats)) {
      throw new BadRequestException('Xe hai tầng cần ít nhất một ghế ở mỗi tầng.');
    }
    const savedCar = await this.carRepository.save(carEntity, {
      deckCount, lowerDeckSeats, seatClass: input.seatClass ?? 'STANDARD', seatColumns: input.seatColumns ?? 3,
    });

    // 6. Trả về Output DTO
    return {
      id: savedCar.id!,
      operatorId: savedCar.operatorId,
      name: savedCar.name,
      type: savedCar.type,
      status: savedCar.status,
      licensePlate: savedCar.licensePlate.getValue(),
      totalSeats: savedCar.totalSeats,
      createdAt: savedCar.createdAt!,
      updatedAt: savedCar.updatedAt!,
    };
  }
}
