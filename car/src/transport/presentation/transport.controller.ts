import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { AuthenticatedRequest } from '../../auth/auth-user';
import { hasRole } from '../../auth/auth-user';
import { Internal } from '../../auth/internal.decorator';
import { Public } from '../../auth/public.decorator';
import { TransportService } from '../application/transport.service';
import {
  CheckInDto,
  IssueTicketsDto,
  QuoteRequestDto,
  ReplaceSeatsDto,
} from './transport.dto';

class CancelTripDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}

@Controller()
export class TransportController {
  constructor(private readonly service: TransportService) {}

  @Put('cars/:carId/seats')
  replaceSeatTemplate(
    @Param('carId') carId: string,
    @Body() body: ReplaceSeatsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    return this.service.replaceSeatTemplate(carId, request.authUser!.id, body.seats);
  }

  @Post('trips/:tripId/publish')
  publish(@Param('tripId') tripId: string, @Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    return this.service.publish(tripId, request.authUser!.id);
  }

  @Post('trips/:tripId/stop-sale')
  stopSale(@Param('tripId') tripId: string, @Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    return this.service.stopSale(tripId, request.authUser!.id);
  }

  @Post('trips/:tripId/cancel')
  cancelTrip(@Param('tripId') tripId: string, @Body() body: CancelTripDto,
    @Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    return this.service.requestTripCancellation(tripId, request.authUser!.id, body.reason);
  }

  @Get('trips/:tripId/seats')
  @Public()
  seatMap(@Param('tripId') tripId: string) {
    return this.service.seatMap(tripId);
  }

  @Post('tickets/check-in')
  checkIn(@Body() body: CheckInDto, @Req() request: AuthenticatedRequest) {
    return this.service.checkIn(body.token, request.authUser!.id);
  }
}

@Controller('api/v1/internal/car/transport')
export class TransportInternalController {
  constructor(private readonly service: TransportService) {}

  @Get('orders/:orderId/tickets')
  @Internal()
  async orderTickets(@Param('orderId') orderId: string) {
    return { success: true, data: await this.service.orderTickets(orderId) };
  }

  @Post('quote')
  @Internal()
  async quote(@Body() body: QuoteRequestDto) {
    return { success: true, data: await this.service.quote(body.tripId, body.passengers) };
  }

  @Post('tickets')
  @Internal()
  async issueTickets(@Body() body: IssueTicketsDto) {
    return {
      success: true,
      data: await this.service.issueTickets(body.orderId, body.items.map((item) => ({
        orderItemId: item.orderItemId,
        seatId: item.seatId,
        passengerName: item.passengerName,
        pickupStopId: item.pickupStopId,
        dropoffStopId: item.dropoffStopId,
      }))),
    };
  }

  @Post('tickets/void-order/:orderId')
  @Internal()
  async voidTickets(@Param('orderId') orderId: string) {
    return { success: true, data: await this.service.voidTickets(orderId) };
  }
}
