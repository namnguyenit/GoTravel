import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { hasRole } from '../../auth/auth-user';
import type { AuthenticatedRequest } from '../../auth/auth-user';
import { Internal } from '../../auth/internal.decorator';
import { TransportOperationsService } from '../application/transport-operations.service';

class AdminCancelDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
class LifecycleDto {
  @IsIn(['DEPARTED', 'COMPLETED']) status!: 'DEPARTED' | 'COMPLETED';
}
class PricingDto {
  @IsObject() classPrices!: Record<string, string>;
}
class SeatBlockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { each: true, message: 'seatIds must contain UUID strings' },
  )
  seatIds!: string[];
  @IsBoolean() blocked!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

@Controller('trips')
export class TransportOperationsController {
  constructor(private readonly service: TransportOperationsService) {}
  @Post(':tripId/admin-cancellation')
  adminCancel(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: AdminCancelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'ADMIN')) throw new ForbiddenException();
    return this.service.adminCancel(tripId, req.authUser!.id, dto.reason);
  }
  @Put(':tripId/admin-lifecycle')
  adminLifecycle(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: LifecycleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'ADMIN')) throw new ForbiddenException();
    return this.service.adminLifecycle(tripId, req.authUser!.id, dto.status);
  }
  @Put(':tripId/lifecycle')
  lifecycle(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: LifecycleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.lifecycle(tripId, req.authUser!.id, dto.status);
  }
  @Get(':tripId/manifest')
  manifest(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.manifest(tripId, req.authUser!.id);
  }
  @Post(':tripId/tickets/:ticketId/no-show')
  noShow(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.noShow(tripId, ticketId, req.authUser!.id);
  }
  @Put(':tripId/class-prices')
  pricing(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: PricingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.pricing(tripId, req.authUser!.id, dto.classPrices);
  }
  @Put(':tripId/seat-blocks')
  blockSeats(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: SeatBlockDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.blockSeats(
      tripId,
      req.authUser!.id,
      dto.seatIds,
      dto.blocked,
      dto.reason,
    );
  }
}

@Controller('api/v1/internal/car/transport')
export class TransportOperationsInternalController {
  constructor(private readonly service: TransportOperationsService) {}
  @Get('trips/:tripId/state')
  @Internal()
  async tripState(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return { success: true, data: await this.service.tripState(tripId) };
  }
}
