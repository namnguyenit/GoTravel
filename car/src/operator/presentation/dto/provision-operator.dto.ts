import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ProvisionOperatorDto {
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
