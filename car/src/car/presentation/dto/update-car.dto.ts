import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CarType } from '../../domain/value-object/car-type.enum';

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  @Length(3, 100, { message: 'Tên xe phải có độ dài từ 3 đến 100 ký tự.' })
  name?: string;

  @IsOptional()
  @IsEnum(CarType, { message: 'Loại xe không hợp lệ.' })
  type?: CarType;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/, {
    message:
      'Biển số xe không đúng định dạng chuẩn Việt Nam (VD: 29B-12345, 51A-9999).',
  })
  licensePlate?: string;
}
