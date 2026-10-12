import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SeatDefinitionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
  @IsInt()
  @Min(1)
  @Max(3)
  level!: number;
  @IsString()
  @IsNotEmpty()
  seatClass!: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) row?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) column?: number;
}

export class ReplaceSeatsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SeatDefinitionDto)
  seats!: SeatDefinitionDto[];
}

export class QuotePassengerDto {
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { message: 'seatId must be a UUID' },
  )
  seatId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
  @IsUUID()
  pickupStopId!: string;
  @IsUUID()
  dropoffStopId!: string;
}

export class QuoteRequestDto {
  @IsUUID()
  tripId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuotePassengerDto)
  passengers!: QuotePassengerDto[];
}

export class IssueTicketItemDto {
  @IsUUID()
  orderItemId!: string;
  @IsUUID()
  tripId!: string;
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { message: 'seatId must be a UUID' },
  )
  seatId!: string;
  @IsString()
  @IsNotEmpty()
  passengerName!: string;
  @IsUUID()
  pickupStopId!: string;
  @IsUUID()
  dropoffStopId!: string;
}

export class IssueTicketsDto {
  @IsUUID()
  orderId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => IssueTicketItemDto)
  items!: IssueTicketItemDto[];
}

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class AmendTicketDto {
  @IsUUID() @IsNotEmpty() commandId!: string;
  @IsUUID() @IsNotEmpty() orderId!: string;
  @IsUUID() @IsNotEmpty() orderItemId!: string;
  @IsUUID() @IsNotEmpty() ticketId!: string;
  @IsInt() @Min(1) expectedRevision!: number;
  @IsString() @IsNotEmpty() @MaxLength(64) payloadHash!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) passengerName!: string;
  @IsUUID() @IsNotEmpty() pickupStopId!: string;
  @IsUUID() @IsNotEmpty() dropoffStopId!: string;
}
