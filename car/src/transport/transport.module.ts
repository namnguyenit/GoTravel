import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffModule } from '../staff/staff.module';
import { TransportService } from './application/transport.service';
import { HttpTransportIntegrations } from './infrastructure/http-transport.integrations';
import { PrismaTransportRepository } from './infrastructure/prisma-transport.repository';
import { TransportController, TransportInternalController } from './presentation/transport.controller';

@Module({
  imports: [PrismaModule, StaffModule],
  controllers: [TransportController, TransportInternalController],
  providers: [
    TransportService,
    { provide: 'TransportRepository', useClass: PrismaTransportRepository },
    { provide: 'TransportIntegrations', useClass: HttpTransportIntegrations },
  ],
  exports: ['TransportIntegrations'],
})
export class TransportModule {}
