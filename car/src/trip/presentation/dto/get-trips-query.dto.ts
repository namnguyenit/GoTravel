import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../../domain/value-object/trip-status.enum';

export class GetTripsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(TripStatus, {
    message: 'Trạng thái chuyến đi phải là SCHEDULED, DEPARTED, COMPLETED hoặc CANCELLED.',
  })
  status?: TripStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Mã tuyến đường (routeId) phải là UUID hợp lệ.' })
  routeId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Mã xe khách (carId) phải là UUID hợp lệ.' })
  carId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày xuất bến (departureDate) phải có định dạng YYYY-MM-DD.',
  })
  departureDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(100, { message: 'Số dòng tối đa là 100.' })
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['departureTime', 'pricePerSeat', 'createdAt'], {
    message: 'SortBy phải là departureTime, pricePerSeat hoặc createdAt.',
  })
  sortBy?: 'departureTime' | 'pricePerSeat' | 'createdAt' = 'departureTime';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc' = 'asc';
}
