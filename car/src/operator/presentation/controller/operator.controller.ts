import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Inject,
  ForbiddenException,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { Public } from '../../../auth/public.decorator';
import { GetOperatorsQueryDto } from '../dto/get-operators-query.dto';
import { UpdateOperatorProfileDto } from '../dto/update-operator-profile.dto';
import { UpdateOperatorStatusDto } from '../dto/update-operator-status.dto';
import type { IGetOperatorsUseCase } from '../../application/port/get-operators.usecase.interface';
import { OperatorProfileService } from '../../application/operator-profile.service';
import { OperatorPresentationMapper } from '../mapper/operator-presentation.mapper';

@Controller('operators')
export class OperatorController {
  constructor(
    @Inject('IGetOperatorsUseCase')
    private readonly getOperatorsUseCase: IGetOperatorsUseCase,
    private readonly profileService: OperatorProfileService,
  ) {}

  private checkAdminRole(request: AuthenticatedRequest): void {
    if (!hasRole(request.authUser!, 'ADMIN')) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này. Chỉ Quản trị viên (Admin) mới có quyền truy cập.',
      );
    }
  }

  /**
   * Nhà xe xem hồ sơ thương mại của chính mình
   */
  @Get('me/profile')
  async getMyProfile(@Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) {
      throw new ForbiddenException(
        'Chỉ chủ nhà xe mới có quyền truy cập hồ sơ này',
      );
    }
    const data = await this.profileService.getMyProfile(request.authUser!.id);
    return {
      success: true,
      code: 'GET_MY_OPERATOR_PROFILE_SUCCESS',
      message: 'Lấy thông tin hồ sơ nhà xe thành công',
      data,
    };
  }

  /**
   * Nhà xe cập nhật hồ sơ thương mại
   */
  @Patch('me/profile')
  async updateMyProfile(
    @Body() dto: UpdateOperatorProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) {
      throw new ForbiddenException(
        'Chỉ chủ nhà xe mới có quyền chỉnh sửa hồ sơ này',
      );
    }
    const data = await this.profileService.updateMyProfile(
      request.authUser!.id,
      dto,
    );
    return {
      success: true,
      code: 'UPDATE_MY_OPERATOR_PROFILE_SUCCESS',
      message: 'Cập nhật hồ sơ thương mại thành công',
      data,
    };
  }

  /**
   * Quản trị viên đình chỉ hoặc kích hoạt nhà xe (Durable safe suspension)
   */
  @Patch(':operatorId/status')
  async updateOperatorStatus(
    @Param('operatorId', new ParseUUIDPipe()) operatorId: string,
    @Body() dto: UpdateOperatorStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.checkAdminRole(request);
    const data = await this.profileService.updateStatus(
      operatorId,
      request.authUser!.id,
      dto,
    );
    return {
      success: true,
      code: 'UPDATE_OPERATOR_STATUS_SUCCESS',
      message:
        dto.status === 'SUSPENDED'
          ? 'Đã đình chỉ hoạt động nhà xe thành công'
          : 'Đã kích hoạt lại nhà xe thành công',
      data,
    };
  }

  /**
   * Quản trị viên xem danh sách các Nhà xe chính thức trên hệ thống
   */
  @Get()
  async getOperators(
    @Query() query: GetOperatorsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.checkAdminRole(request);

    const input = OperatorPresentationMapper.toGetOperatorsInput(query);
    const result = await this.getOperatorsUseCase.execute(input);
    return OperatorPresentationMapper.toGetOperatorsApiResponse(result);
  }
  /**
   * Khách hàng xem hồ sơ thương mại công khai của Nhà xe
   */
  @Get(':operatorId/profile')
  @Public()
  async getPublicProfile(
    @Param('operatorId', new ParseUUIDPipe()) operatorId: string,
  ) {
    const data = await this.profileService.getPublicProfile(operatorId);
    return {
      success: true,
      code: 'GET_OPERATOR_PUBLIC_PROFILE_SUCCESS',
      message: 'Lấy thông tin nhà xe thành công',
      data,
    };
  }
}
