import {
  Controller,
  Get,
  Query,
  Inject,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { GetOperatorsQueryDto } from '../dto/get-operators-query.dto';
import type { IGetOperatorsUseCase } from '../../application/port/get-operators.usecase.interface';
import { OperatorPresentationMapper } from '../mapper/operator-presentation.mapper';

@Controller('operators')
export class OperatorController {
  constructor(
    @Inject('IGetOperatorsUseCase')
    private readonly getOperatorsUseCase: IGetOperatorsUseCase,
  ) {}

  private checkAdminRole(request: AuthenticatedRequest): void {
    if (!hasRole(request.authUser!, 'ADMIN')) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này. Chỉ Quản trị viên (Admin) mới có quyền truy cập.',
      );
    }
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
}
