import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchTripsQueryDto {
  @IsNotEmpty({ message: 'Điểm khởi hành (origin) không được để trống.' })
  @IsString({ message: 'Điểm khởi hành phải là chuỗi ký tự.' })
  origin: string;

  @IsNotEmpty({ message: 'Điểm đến (destination) không được để trống.' })
  @IsString({ message: 'Điểm đến phải là chuỗi ký tự.' })
  destination: string;

  @IsNotEmpty({ message: 'Ngày khởi hành (departureDate) không được để trống.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày khởi hành (departureDate) phải có định dạng YYYY-MM-DD.',
  })
  departureDate: string;

  @IsOptional()
  @IsEnum(['SLEEPER', 'LIMOUSINE', 'SEAT'], {
    message: 'Loại xe (type) phải là SLEEPER, LIMOUSINE hoặc SEAT.',
  })
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá vé tối thiểu phải là số.' })
  @Min(0, { message: 'Giá vé tối thiểu không được âm.' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá vé tối đa phải là số.' })
  @Min(0, { message: 'Giá vé tối đa không được âm.' })
  maxPrice?: number;

  @IsOptional()
  @IsUUID('all', { message: 'Mã nhà xe (operatorId) phải là UUID hợp lệ.' })
  operatorId?: string;

  @IsOptional()
  @IsEnum(['departureTime', 'pricePerSeat'], {
    message: 'SortBy phải là departureTime hoặc pricePerSeat.',
  })
  sortBy?: 'departureTime' | 'pricePerSeat' = 'departureTime';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(50, { message: 'Số dòng tối đa là 50.' })
  limit?: number = 10;
}
