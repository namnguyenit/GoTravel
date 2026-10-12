import { Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { Internal } from '../../auth/internal.decorator';
import { ItemTicketService } from '../application/item-ticket.service';
@Controller('api/v1/internal/car/transport/item-operations')
export class ItemTicketController {
  constructor(private readonly service: ItemTicketService) {}
  @Put(':id/prepare') @Internal() async prepare(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { success: true, data: await this.service.apply(id, 'prepare') };
  }
  @Put(':id/commit') @Internal() async commit(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { success: true, data: await this.service.apply(id, 'commit') };
  }
  @Put(':id/abort') @Internal() async abort(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { success: true, data: await this.service.apply(id, 'abort') };
  }
}
