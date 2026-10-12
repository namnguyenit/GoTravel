import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateOperatorProfileDto {
  @IsOptional()
  @IsString({ message: 'Tên thương hiệu phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Tên thương hiệu không vượt quá 100 ký tự.' })
  displayName?: string;

  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'URL logo phải là đường dẫn HTTPS hợp lệ.' },
  )
  @MaxLength(500, { message: 'URL logo không vượt quá 500 ký tự.' })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Số điện thoại không vượt quá 20 ký tự.' })
  @Matches(/^[0-9+\s\-()]{8,20}$/, {
    message: 'Số điện thoại liên hệ không hợp lệ.',
  })
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Địa chỉ liên hệ không vượt quá 255 ký tự.' })
  contactAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không vượt quá 1000 ký tự.' })
  description?: string;
}
