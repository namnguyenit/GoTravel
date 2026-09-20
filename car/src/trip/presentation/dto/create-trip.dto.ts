import {
  IsNotEmpty,
  IsUUID,
  IsISO8601,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsNotEmpty({ message: 'Tuyến đường (routeId) không được để trống.' })
  @IsUUID('all', { message: 'Mã tuyến đường (routeId) phải là UUID hợp lệ.' })
  routeId: string;

  @IsNotEmpty({ message: 'Xe khách (carId) không được để trống.' })
  @IsUUID('all', { message: 'Mã xe khách (carId) phải là UUID hợp lệ.' })
  carId: string;

  @IsNotEmpty({ message: 'Thời gian xuất bến không được để trống.' })
  @IsISO8601({}, { message: 'Thời gian xuất bến phải là chuỗi ngày giờ theo định dạng ISO 8601.' })
  departureTime: string;

  @IsNotEmpty({ message: 'Thời gian đến dự kiến không được để trống.' })
  @IsISO8601({}, { message: 'Thời gian đến dự kiến phải là chuỗi ngày giờ theo định dạng ISO 8601.' })
  arrivalTime: string;

  @IsNotEmpty({ message: 'Giá vé cơ bản trên mỗi ghế không được để trống.' })
  @IsNumber({}, { message: 'Giá vé cơ bản phải là số nguyên (VNĐ).' })
  @Min(10000, { message: 'Giá vé cơ bản tối thiểu là 10.000 VNĐ.' })
  pricePerSeat: number;
}
