import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateOperatorStopDto {
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Tên điểm dừng từ 2 đến 100 ký tự.' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255, { message: 'Địa chỉ từ 2 đến 255 ký tự.' })
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Tỉnh/thành phố từ 2 đến 100 ký tự.' })
  province?: string;
}
