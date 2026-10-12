import { IsEnum, IsNotEmpty } from 'class-validator';
import { CarStatus } from '../../domain/value-object/car-status.enum';

export class UpdateCarStatusDto {
  @IsNotEmpty({ message: 'Trạng thái xe không được để trống.' })
  @IsEnum(CarStatus, { message: 'Trạng thái xe không hợp lệ.' })
  status!: CarStatus;
}
