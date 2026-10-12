import { Module } from '@nestjs/common';
import { OperatorStopController } from './presentation/controller/operator-stop.controller';
import { OperatorStopService } from './application/operator-stop.service';
import { PrismaOperatorStopRepository } from './infrastructure/repository/prisma-operator-stop.repository';

@Module({
  controllers: [OperatorStopController],
  providers: [
    OperatorStopService,
    {
      provide: 'IOperatorStopRepository',
      useClass: PrismaOperatorStopRepository,
    },
  ],
  exports: [OperatorStopService, 'IOperatorStopRepository'],
})
export class StopModule {}
