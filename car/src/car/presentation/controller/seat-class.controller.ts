import { Body, Controller, ForbiddenException, Get, Post, Req } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { SeatClassService } from '../../application/seat-class.service';

class SeatClassDto {
  @IsString() @Matches(/^[A-Z0-9_]{1,32}$/) code!: string;
  @IsString() @Length(1, 80) label!: string;
}
@Controller('cars/seat-classes')
export class SeatClassController {
  constructor(private readonly service: SeatClassService) {}
  private actor(request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    return request.authUser!.id;
  }
  @Get() async list(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.service.list(this.actor(request)) };
  }
  @Post() async create(@Req() request: AuthenticatedRequest, @Body() body: SeatClassDto) {
    return { success: true, data: await this.service.create(this.actor(request), body.code, body.label) };
  }
}
