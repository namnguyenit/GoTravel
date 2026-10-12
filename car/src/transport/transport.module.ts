import { ItemTicketController } from './presentation/item-ticket.controller';
import { ItemTicketService } from './application/item-ticket.service';
import { PrismaItemTicketRepository } from './infrastructure/prisma-item-ticket.repository';
import { TransportOperationsService } from './application/transport-operations.service';
import {
  TransportOperationsController,
  TransportOperationsInternalController,
} from './presentation/transport-operations.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffModule } from '../staff/staff.module';
import { TransportService } from './application/transport.service';
import { HttpTransportIntegrations } from './infrastructure/http-transport.integrations';
import { PrismaTransportRepository } from './infrastructure/prisma-transport.repository';
import {
  TransportController,
  TransportInternalController,
} from './presentation/transport.controller';

@Module({
  imports: [PrismaModule, StaffModule],
  controllers: [
    ItemTicketController,
    TransportController,
    TransportInternalController,
    TransportOperationsController,
    TransportOperationsInternalController,
  ],
  providers: [
    ItemTicketService,
    { provide: 'ItemTicketRepository', useClass: PrismaItemTicketRepository },
    TransportService,
    TransportOperationsService,
    { provide: 'TransportRepository', useClass: PrismaTransportRepository },
    { provide: 'TransportIntegrations', useClass: HttpTransportIntegrations },
  ],
  exports: ['TransportIntegrations', TransportOperationsService],
})
export class TransportModule {}
