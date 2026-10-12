import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';
import type { AuthenticatedRequest } from '../../auth/auth-user';
import { hasRole } from '../../auth/auth-user';
import { Internal } from '../../auth/internal.decorator';
import { StaffService } from '../application/staff.service';

export class AssignStaffDto {
  @IsBoolean() canSellCash: boolean;
  @IsBoolean() canCheckIn: boolean;
  @IsBoolean() active: boolean;
  @IsOptional() @IsBoolean() canManageTrip?: boolean;
  @IsOptional() @IsBoolean() canCloseShift?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  tripIds?: string[];
}

@Controller('operators/me/staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get()
  async listStaff(@Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    return {
      success: true,
      data: await this.service.listStaff(request.authUser!.id),
    };
  }

  @Put(':userId')
  assign(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: AssignStaffDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    return this.service.assign(
      request.authUser!.id,
      userId,
      body.canSellCash,
      body.canCheckIn,
      body.active,
      {
        canManageTrip: body.canManageTrip,
        canCloseShift: body.canCloseShift,
        tripIds: body.tripIds,
      },
    );
  }
}

@Controller('staff/me')
export class StaffMeController {
  constructor(private readonly service: StaffService) {}

  @Get('assignments')
  async getAssignments(@Req() request: AuthenticatedRequest) {
    if (
      !hasRole(request.authUser!, 'STAFF') &&
      !hasRole(request.authUser!, 'TICKET_VENDOR')
    ) {
      throw new ForbiddenException();
    }
    return {
      success: true,
      data: await this.service.getAssignmentsForStaff(request.authUser!.id),
    };
  }

  @Get('trips')
  async getAssignedTrips(@Req() request: AuthenticatedRequest) {
    if (
      !hasRole(request.authUser!, 'STAFF') &&
      !hasRole(request.authUser!, 'TICKET_VENDOR')
    ) {
      throw new ForbiddenException();
    }
    return {
      success: true,
      data: await this.service.getAssignedTripsForStaff(request.authUser!.id),
    };
  }
}

@Controller('api/v1/internal/car/staff')
export class StaffInternalController {
  constructor(private readonly service: StaffService) {}

  @Get('read-scope')
  @Internal()
  async getReadScope(
    @Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('operatorId') operatorId?: string,
  ) {
    return {
      success: true,
      data: await this.service.getReadScope(actorId, operatorId),
    };
  }

  @Get('authorize-operator')
  @Internal()
  async authorizeOperator(
    @Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('operatorId', new ParseUUIDPipe()) operatorId: string,
  ) {
    return {
      success: true,
      data: await this.service.verifyOperator(
        actorId,
        operatorId,
        'CLOSE_SHIFT',
      ),
    };
  }

  @Get('authorize')
  @Internal()
  async authorize(
    @Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('tripId', new ParseUUIDPipe()) tripId: string,
    @Query('capability') capability: string,
  ) {
    if (
      !['SELL_CASH', 'CHECK_IN', 'MANAGE_TRIP', 'CLOSE_SHIFT'].includes(
        capability,
      )
    ) {
      throw new ForbiddenException('Quyền không hợp lệ');
    }
    return {
      success: true,
      data: await this.service.verify(
        actorId,
        tripId,
        capability as import('../domain/staff.repository').StaffCapability,
      ),
    };
  }
}
