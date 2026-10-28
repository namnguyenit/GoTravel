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
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { AuthenticatedRequest } from '../../auth/auth-user';
import { hasRole } from '../../auth/auth-user';
import { Internal } from '../../auth/internal.decorator';
import { Public } from '../../auth/public.decorator';
import { TransportOperationsService } from '../application/transport-operations.service';
import { TransportService } from '../application/transport.service';
import {
  CheckInDto,
  IssueTicketsDto,
  QuoteRequestDto,
  ReplaceSeatsDto,
  AmendTicketDto,
} from './transport.dto';

class ClaimQuoteDto {
  @IsString() @IsNotEmpty() @MaxLength(64) quoteHash!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) orderId!: string;
}

class CancelTripDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}

@Controller()
export class TransportController {
  constructor(
    private readonly service: TransportService,
    private readonly operations: TransportOperationsService,
  ) {}

  @Put('cars/:carId/seats')
  replaceSeatTemplate(
    @Param('carId', new ParseUUIDPipe()) carId: string,
    @Body() body: ReplaceSeatsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    return this.service.replaceSeatTemplate(
      carId,
      request.authUser!.id,
      body.seats,
    );
  }

  @Post('trips/:tripId/publish')
  publish(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.operations.publish(tripId, request.authUser!.id);
  }

  @Post('trips/:tripId/resume-sale')
  resume(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.operations.publish(tripId, request.authUser!.id);
  }

  @Post('trips/:tripId/stop-sale')
  stopSale(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.operations.stopSale(tripId, request.authUser!.id);
  }

  @Post('trips/:tripId/cancel')
  cancelTrip(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() body: CancelTripDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.operations.cancelTrip(
      tripId,
      request.authUser!.id,
      body.reason,
    );
  }

  @Get('trips/:tripId')
  @Public()
  detail(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return this.service.publicDetail(tripId);
  }

  @Get('trips/:tripId/stops')
  @Public()
  async stops(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return (await this.service.publicDetail(tripId)).stops;
  }

  @Get('trips/:tripId/seats')
  @Public()
  seatMap(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
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

  @Get('orders/:orderId/trips/:tripId')
  @Internal()
  async ticketTrip(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ) {
    return { success: true, data: await this.service.ticketTrip(orderId, tripId) };
  }

  @Get('orders/:orderId/tickets')
  @Internal()
  async orderTickets(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return { success: true, data: await this.service.orderTickets(orderId) };
  }

  @Post('quotes/:quoteId/claim')
  @Internal()
  async claimQuote(
    @Param('quoteId', new ParseUUIDPipe()) quoteId: string,
    @Body() dto: ClaimQuoteDto,
  ) {
    return {
      success: true,
      data: await this.service.claimQuote(quoteId, dto.orderId, dto.quoteHash),
    };
  }

  @Post('quote')
  @Internal()
  async quote(@Body() body: QuoteRequestDto) {
    return {
      success: true,
      data: await this.service.quote(body.tripId, body.passengers),
    };
  }

  @Post('tickets')
  @Internal()
  async issueTickets(@Body() body: IssueTicketsDto) {
    return {
      success: true,
      data: await this.service.issueTickets(
        body.orderId,
        body.items.map((item) => ({
          orderItemId: item.orderItemId,
          seatId: item.seatId,
          passengerName: item.passengerName,
          pickupStopId: item.pickupStopId,
          dropoffStopId: item.dropoffStopId,
        })),
      ),
    };
  }

  @Post('tickets/void-order/:orderId')
  @Internal()
  async voidTickets(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return { success: true, data: await this.service.voidTickets(orderId) };
  }

  @Post('tickets/amend')
  @Internal()
  async amendTicket(@Body() body: AmendTicketDto) {
    return { success: true, data: await this.service.amendTicket(body) };
  }
}
