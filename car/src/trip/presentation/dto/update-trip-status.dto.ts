import { IsEnum, IsNotEmpty } from 'class-validator';
import { TripStatus } from '../../domain/value-object/trip-status.enum';

export class UpdateTripStatusDto {
  @IsNotEmpty({ message: 'Trạng thái chuyến đi không được để trống.' })
  @IsEnum(TripStatus, {
    message: 'Trạng thái chuyến đi phải là SCHEDULED, DEPARTED, COMPLETED hoặc CANCELLED.',
  })
  status: TripStatus;
}
