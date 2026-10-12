import { PrismaOperatorProfileRepository } from './infrastructure/repository/prisma-operator-profile.repository';
import { Module } from '@nestjs/common';
import { OperatorController } from './presentation/controller/operator.controller';
import { GetOperatorsUseCase } from './application/usecase/get-operators.usecase';
import { PrismaOperatorRepository } from './infrastructure/repository/prisma-operator.repository';
import { OperatorProfileService } from './application/operator-profile.service';
import { OperatorInternalController } from './presentation/controller/operator-internal.controller';

@Module({
  controllers: [
    OperatorController,
    OperatorInternalController,
  ],
  providers: [
    {
      provide: 'OperatorProfileRepository',
      useClass: PrismaOperatorProfileRepository,
    },
    OperatorProfileService,
    {
      provide: 'IOperatorRepository',
      useClass: PrismaOperatorRepository,
    },
    {
      provide: 'IGetOperatorsUseCase',
      useClass: GetOperatorsUseCase,
    },
  ],
  exports: [
    'IOperatorRepository',
    'IGetOperatorsUseCase',
    OperatorProfileService,
  ],
})
export class OperatorModule {}
