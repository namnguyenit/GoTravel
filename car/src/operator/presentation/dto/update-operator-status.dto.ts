import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateOperatorStatusDto {
  @IsNotEmpty({ message: 'Trạng thái nhà xe không được để trống.' })
  @IsIn(['ACTIVE', 'SUSPENDED'], {
    message: 'Trạng thái chỉ có thể là ACTIVE hoặc SUSPENDED.',
  })
  status!: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Lý do đình chỉ không vượt quá 500 ký tự.' })
  reason?: string;
}
