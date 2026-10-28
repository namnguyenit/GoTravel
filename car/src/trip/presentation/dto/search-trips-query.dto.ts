import {
  IsEnum,
  IsBoolean,
  MaxLength,
  IsIn,
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
import { Type, Transform } from 'class-transformer';

export class SearchTripsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  originRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationRegion?: string;

  @IsOptional()
  @MaxLength(120)
  @IsString({ message: 'Điểm khởi hành phải là chuỗi ký tự.' })
  origin?: string;

  @IsOptional()
  @MaxLength(120)
  @IsString({ message: 'Điểm đến phải là chuỗi ký tự.' })
  destination?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày khởi hành (departureDate) phải có định dạng YYYY-MM-DD.',
  })
  departureDate?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  discover?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredOrigin?: string;

  @IsOptional()
  @IsIn(['EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING'])
  timeRange?: string;

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
