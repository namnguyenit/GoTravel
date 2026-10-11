import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Put, Query, Req } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import type { AuthenticatedRequest } from '../../auth/auth-user';
import { hasRole } from '../../auth/auth-user';
import { Internal } from '../../auth/internal.decorator';
import { StaffService } from '../application/staff.service';

export class AssignStaffDto {
  @IsBoolean() canSellCash: boolean;
  @IsBoolean() canCheckIn: boolean;
  @IsBoolean() active: boolean;
}

@Controller('operators/me/staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Put(':userId')
  assign(@Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: AssignStaffDto, @Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    return this.service.assign(request.authUser!.id, userId,
      body.canSellCash, body.canCheckIn, body.active);
  }
}

@Controller('api/v1/internal/car/staff')
export class StaffInternalController {
  constructor(private readonly service: StaffService) {}

  @Get('authorize')
  @Internal()
  async authorize(@Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('tripId', new ParseUUIDPipe()) tripId: string,
    @Query('capability') capability: string) {
    if (capability !== 'SELL_CASH' && capability !== 'CHECK_IN') {
      throw new ForbiddenException('Quyền không hợp lệ');
    }
    return { success: true, data: await this.service.verify(actorId, tripId, capability) };
  }
}
