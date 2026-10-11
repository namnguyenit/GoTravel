import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffService } from './application/staff.service';
import { HttpStaffAccount } from './infrastructure/http-staff-account';
import { PrismaStaffRepository } from './infrastructure/prisma-staff.repository';
import { StaffController, StaffInternalController } from './presentation/staff.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StaffController, StaffInternalController],
  providers: [StaffService,
    { provide: 'StaffRepository', useClass: PrismaStaffRepository },
    { provide: 'StaffAccountPort', useClass: HttpStaffAccount }],
  exports: [StaffService],
})
export class StaffModule {}
