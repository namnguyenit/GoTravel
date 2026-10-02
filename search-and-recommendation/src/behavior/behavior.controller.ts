import { Body, Controller, Headers, Post, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { TrackEventDto } from './behavior.dto';
import { BehaviorService } from './behavior.service';

@Controller('api/v1/recommendations/events')
export class BehaviorController {
  constructor(private readonly behaviorService: BehaviorService) {}

  @Post()
  async trackEvent(
    @Body(new ValidationPipe({ transform: true })) dto: TrackEventDto,
    @Headers('x-user-id') userId?: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.behaviorService.trackEvent({ ...dto, userId });
  }
}
