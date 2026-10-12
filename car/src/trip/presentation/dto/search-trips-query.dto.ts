import {
  IsEnum,
  IsArray,
  ArrayMaxSize,
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

  @IsNotEmpty({
    message: 'Ngày khởi hành (departureDate) không được để trống.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày khởi hành (departureDate) phải có định dạng YYYY-MM-DD.',
  })
  departureDate: string;

  @IsOptional()
  @IsEnum(['morning', 'afternoon', 'evening'])
  timeOfDay?: 'morning' | 'afternoon' | 'evening';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/, {
    each: true,
  })
  timeSlots?: string[];

  @IsOptional()
  @IsEnum(['SLEEPER', 'LIMOUSINE', 'SEAT'], {
    message: 'Loại xe (type) phải là SLEEPER, LIMOUSINE hoặc SEAT.',
  })
  type?: string;

  @IsOptional()
  @Type(() => String)
  @Matches(/^\d{1,18}$/)
  minPrice?: string;
  @IsOptional()
  @Type(() => String)
  @Matches(/^\d{1,18}$/)
  maxPrice?: string;

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
