import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Inject,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { CreateOperatorApplicationDto } from '../dto/create-operator-application.dto';
import { ProcessOperatorApplicationDto } from '../dto/process-operator-application.dto';
import type { ICreateOperatorApplicationUseCase } from '../../application/port/create-operator-application.usecase.interface';
import type { IProcessOperatorApplicationUseCase } from '../../application/port/process-operator-application.usecase.interface';
import type { IGetOperatorApplicationsUseCase } from '../../application/port/get-operator-applications.usecase.interface';
import type { IGetMyOperatorStatusUseCase } from '../../application/port/get-my-operator-status.usecase.interface';
import { OperatorApplicationPresentationMapper } from '../mapper/operator-application-presentation.mapper';
import { OperatorApplicationStatus } from '../../domain/value-object/operator-application-status.enum';

@Controller('operator-applications')
export class OperatorApplicationController {
  constructor(
    @Inject('ICreateOperatorApplicationUseCase')
    private readonly createApplicationUseCase: ICreateOperatorApplicationUseCase,
    @Inject('IProcessOperatorApplicationUseCase')
    private readonly processApplicationUseCase: IProcessOperatorApplicationUseCase,
    @Inject('IGetOperatorApplicationsUseCase')
    private readonly getApplicationsUseCase: IGetOperatorApplicationsUseCase,
    @Inject('IGetMyOperatorStatusUseCase')
    private readonly getMyStatusUseCase: IGetMyOperatorStatusUseCase,
  ) {}

  private checkAdminRole(request: AuthenticatedRequest): void {
    if (!hasRole(request.authUser!, 'ADMIN')) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này. Chỉ Quản trị viên (Admin) mới có quyền truy cập.',
      );
    }
  }

  /**
   * Lấy thông tin trạng thái Nhà xe của người dùng hiện tại (Kiểm tra xem có phải Nhà xe hay không)
   */
  @Get('me')
  async getMyStatus(
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.getMyStatusUseCase.execute({ userId: request.authUser!.id });
    return OperatorApplicationPresentationMapper.toGetMyStatusApiResponse(result);
  }

  /**
   * User nộp đơn xin làm Nhà xe (Bất kỳ người dùng đã đăng nhập nào cũng được gửi đơn)
   */
  @Post()
  async requestOperator(
    @Body() dto: CreateOperatorApplicationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const input = OperatorApplicationPresentationMapper.toInput(dto, request.authUser!.id);
    const result = await this.createApplicationUseCase.execute(input);
    return OperatorApplicationPresentationMapper.toCreateApiResponse(result);
  }

  /**
   * Admin xem danh sách các đơn đăng ký (Chỉ Admin mới có quyền xem)
   */
  @Get()
  async getApplications(
    @Query('status') status?: OperatorApplicationStatus,
    @Req() request?: AuthenticatedRequest,
  ) {
    this.checkAdminRole(request!);

    const list = await this.getApplicationsUseCase.execute(status);
    return OperatorApplicationPresentationMapper.toListApiResponse(list);
  }

  /**
   * Admin xử lý duyệt / từ chối đơn đăng ký (Chỉ Admin mới có quyền)
   */
  @Patch(':id/process')
  async processApplication(
    @Param('id') id: string,
    @Body() dto: ProcessOperatorApplicationDto,
    @Req() request?: AuthenticatedRequest,
  ) {
    this.checkAdminRole(request!);

    const result = await this.processApplicationUseCase.execute({
      applicationId: id,
      status: dto.status,
      rejectReason: dto.rejectReason,
    });
    return OperatorApplicationPresentationMapper.toProcessApiResponse(result);
  }

  /**
   * Helper endpoint: Phê duyệt nhanh đơn đăng ký
   */
  @Patch(':id/approve')
  async approveApplication(
    @Param('id') id: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    this.checkAdminRole(request!);

    const result = await this.processApplicationUseCase.execute({
      applicationId: id,
      status: OperatorApplicationStatus.APPROVED,
    });
    return OperatorApplicationPresentationMapper.toProcessApiResponse(result);
  }

  /**
   * Helper endpoint: Từ chối nhanh đơn đăng ký
   */
  @Patch(':id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Body('rejectReason') rejectReason?: string,
    @Body('reason') reason?: string,
    @Req() request?: AuthenticatedRequest,
  ) {
    this.checkAdminRole(request!);

    const result = await this.processApplicationUseCase.execute({
      applicationId: id,
      status: OperatorApplicationStatus.REJECTED,
      rejectReason: rejectReason || reason,
    });
    return OperatorApplicationPresentationMapper.toProcessApiResponse(result);
  }
}
