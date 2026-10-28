import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouteStopDto {
  @IsOptional()
  @IsUUID('4', { message: 'Mã điểm dừng danh mục không hợp lệ' })
  operatorStopId?: string;

  @IsNotEmpty({ message: 'Tên điểm dừng không được để trống.' })
  @IsString({ message: 'Tên điểm dừng phải là chuỗi ký tự.' })
  @Length(3, 100, {
    message: 'Tên điểm dừng phải có độ dài từ 3 đến 100 ký tự.',
  })
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsNotEmpty({ message: 'Thứ tự điểm dừng không được để trống.' })
  @IsInt({ message: 'Thứ tự điểm dừng phải là số nguyên.' })
  @Min(0, { message: 'Thứ tự điểm dừng phải lớn hơn hoặc bằng 0.' })
  order!: number;
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString({ message: 'Điểm khởi hành phải là chuỗi ký tự.' })
  @Length(2, 100, {
    message: 'Điểm khởi hành phải có độ dài từ 2 đến 100 ký tự.',
  })
  origin?: string;

  @IsOptional()
  @IsString({ message: 'Điểm đến phải là chuỗi ký tự.' })
  @Length(2, 100, { message: 'Điểm đến phải có độ dài từ 2 đến 100 ký tự.' })
  destination?: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách điểm dừng phải là một mảng.' })
  @ArrayMinSize(2, { message: 'Tuyến đường phải có ít nhất 2 điểm dừng.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateRouteStopDto)
  stops?: UpdateRouteStopDto[];
}
