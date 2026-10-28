import { IsEnum, IsInt, IsNotEmpty, IsString, Min, Max, Length, IsOptional, IsIn, Matches } from 'class-validator';
import { CarType } from '../../domain/value-object/car-type.enum';

export class CreateCarDto {
  @IsNotEmpty({ message: 'Tên xe không được để trống.' })
  @IsString({ message: 'Tên xe phải là chuỗi ký tự.' })
  @Length(3, 100, { message: 'Tên xe phải có độ dài từ 3 đến 100 ký tự.' })
  name: string;

  @IsNotEmpty({ message: 'Loại xe không được để trống.' })
  @IsEnum(CarType, { message: 'Loại xe phải là SLEEPER, LIMOUSINE hoặc SEAT.' })
  type: CarType;

  @IsNotEmpty({ message: 'Biển số xe không được để trống.' })
  @IsString({ message: 'Biển số xe phải là chuỗi ký tự.' })
  licensePlate: string;

  @IsNotEmpty({ message: 'Tổng số ghế không được để trống.' })
  @IsInt({ message: 'Tổng số ghế phải là số nguyên.' })
  @Min(1, { message: 'Tổng số ghế phải lớn hơn 0.' })
  @Max(100, { message: 'Sơ đồ hỗ trợ tối đa 100 ghế.' })
  totalSeats: number;

  @IsOptional() @IsInt() @IsIn([1, 2])
  deckCount?: number;

  @IsOptional() @IsInt() @IsIn([2, 3, 4])
  seatColumns?: number;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  lowerDeckSeats?: number;

  @IsOptional() @IsString() @Matches(/^[A-Z0-9_]{1,32}$/)
  seatClass?: string;
}
