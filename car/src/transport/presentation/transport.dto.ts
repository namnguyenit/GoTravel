import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SeatDefinitionDto {
  @IsString() @IsNotEmpty()
  code!: string;
  @IsInt() @Min(1) @Max(3)
  level!: number;
  @IsString() @IsNotEmpty()
  seatClass!: string;
}

export class ReplaceSeatsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => SeatDefinitionDto)
  seats!: SeatDefinitionDto[];
}

export class QuotePassengerDto {
  @IsUUID()
  seatId!: string;
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;
  @IsUUID()
  pickupStopId!: string;
  @IsUUID()
  dropoffStopId!: string;
}

export class QuoteRequestDto {
  @IsUUID()
  tripId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10)
  @ValidateNested({ each: true }) @Type(() => QuotePassengerDto)
  passengers!: QuotePassengerDto[];
}

export class IssueTicketItemDto {
  @IsUUID()
  orderItemId!: string;
  @IsUUID()
  tripId!: string;
  @IsUUID()
  seatId!: string;
  @IsString() @IsNotEmpty()
  passengerName!: string;
  @IsUUID()
  pickupStopId!: string;
  @IsUUID()
  dropoffStopId!: string;
}

export class IssueTicketsDto {
  @IsUUID()
  orderId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10)
  @ValidateNested({ each: true }) @Type(() => IssueTicketItemDto)
  items!: IssueTicketItemDto[];
}

export class CheckInDto {
  @IsString() @IsNotEmpty()
  token!: string;
}
