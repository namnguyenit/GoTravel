import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRoutesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'], {
    message: 'Trạng thái tuyến đường phải là ACTIVE hoặc INACTIVE.',
  })
  status?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'origin', 'destination'], {
    message: 'SortBy phải là createdAt, origin hoặc destination.',
  })
  sortBy?: 'createdAt' | 'origin' | 'destination';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc';

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
}
