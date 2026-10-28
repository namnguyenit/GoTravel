import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class ProvisionOperatorDto {
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string;

  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(255)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;
}
