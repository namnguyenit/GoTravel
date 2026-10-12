import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class TripStopOverrideDto {
  @IsNotEmpty({
    message: 'Mã điểm dừng tuyến (routeStopId) không được để trống.',
  })
  @IsUUID('4', { message: 'Mã điểm dừng tuyến phải là UUID.' })
  routeStopId!: string;

  @IsNotEmpty({ message: 'Thứ tự điểm dừng không được để trống.' })
  @IsInt()
  @Min(0)
  order!: number;

  @IsOptional()
  @IsIn(['PICKUP', 'DROPOFF', 'BOTH'], {
    message: 'Loại điểm dừng phải là PICKUP, DROPOFF hoặc BOTH.',
  })
  type?: 'PICKUP' | 'DROPOFF' | 'BOTH';

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian đón/trả không hợp lệ.' })
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  pickupAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  dropoffAllowed?: boolean;
}

export class SetTripStopsDto {
  @IsArray({ message: 'Danh sách điểm dừng phải là mảng.' })
  @ArrayMinSize(2, { message: 'Chuyến xe phải có ít nhất 2 điểm đón/trả.' })
  @ValidateNested({ each: true })
  @Type(() => TripStopOverrideDto)
  stops!: TripStopOverrideDto[];
}
