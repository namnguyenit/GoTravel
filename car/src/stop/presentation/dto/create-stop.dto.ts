import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateOperatorStopDto {
  @IsNotEmpty({ message: 'Tên điểm dừng không được để trống.' })
  @IsString()
  @Length(2, 100, { message: 'Tên điểm dừng từ 2 đến 100 ký tự.' })
  name!: string;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống.' })
  @IsString()
  @Length(2, 255, { message: 'Địa chỉ từ 2 đến 255 ký tự.' })
  address!: string;

  @IsNotEmpty({ message: 'Tỉnh/thành phố không được để trống.' })
  @IsString()
  @Length(2, 100, { message: 'Tỉnh/thành phố từ 2 đến 100 ký tự.' })
  province!: string;
}
