import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IUpdateRouteStatusUseCase } from '../port/update-route-status.usecase.interface';
import { UpdateRouteStatusInput } from '../dto/update-route-status.input';
import { UpdateRouteStatusOutput } from '../dto/update-route-status.output';
import type { IRouteRepository } from '../../domain/repository/route.repository.interface';

@Injectable()
export class UpdateRouteStatusUseCase implements IUpdateRouteStatusUseCase {
  constructor(
    @Inject('IRouteRepository')
    private readonly routeRepository: IRouteRepository,
  ) {}

  async execute(input: UpdateRouteStatusInput): Promise<UpdateRouteStatusOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã người dùng (userId).');
    }

    if (!input.routeId || !input.routeId.trim()) {
      throw new BadRequestException('Mã tuyến đường (routeId) không được để trống.');
    }

    // 1. Kiểm tra / lấy Operator ID của User
    const operatorId = await this.routeRepository.findOperatorIdByUserId(input.userId);
    if (!operatorId) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.',
      );
    }

    // 2. Kiểm tra tuyến đường tồn tại và thuộc sở hữu của nhà xe
    const route = await this.routeRepository.findById(input.routeId);
    if (!route || route.operatorId !== operatorId) {
      throw new NotFoundException(
        'Không tìm thấy tuyến đường yêu cầu hoặc bạn không có quyền thao tác trên tuyến đường này.',
      );
    }

    // 3. Thực hiện thay đổi trạng thái trong Domain Entity (kiểm tra trạng thái hiện tại)
    try {
      route.changeStatus(input.status);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    // 4. Lưu trạng thái mới vào cơ sở dữ liệu
    const updatedRoute = await this.routeRepository.updateStatus(
      route.id!,
      route.status,
    );

    // 5. Trả về kết quả
    return {
      id: updatedRoute.id!,
      operatorId: updatedRoute.operatorId,
      origin: updatedRoute.origin,
      destination: updatedRoute.destination,
      status: updatedRoute.status,
      createdAt: updatedRoute.createdAt!,
      updatedAt: updatedRoute.updatedAt!,
    };
  }
}
