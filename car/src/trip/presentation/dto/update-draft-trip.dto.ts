import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class UpdateDraftTripDto {
  @IsOptional()
  @IsUUID('4', { message: 'Mã xe không hợp lệ.' })
  carId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Mã tuyến đường không hợp lệ.' })
  routeId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian khởi hành không hợp lệ.' })
  departureTime?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian đến dự kiến không hợp lệ.' })
  arrivalTime?: string;

  @IsOptional()
  @IsString({ message: 'Giá vé phải là chuỗi số nguyên.' })
  @Matches(/^[1-9]\d{0,17}$/, {
    message: 'Giá vé phải là số nguyên dương tính theo VND.',
  })
  priceVnd?: string;
}
