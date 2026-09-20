import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { IGetRoutesUseCase } from '../port/get-routes.usecase.interface';
import { GetRoutesInput } from '../dto/get-routes.input';
import { GetRoutesOutput } from '../dto/get-routes.output';
import type { IRouteRepository } from '../../domain/repository/route.repository.interface';
import { RouteStatus } from '../../domain/value-object/route-status.enum';

@Injectable()
export class GetRoutesUseCase implements IGetRoutesUseCase {
  constructor(
    @Inject('IRouteRepository')
    private readonly routeRepository: IRouteRepository,
  ) {}

  async execute(input: GetRoutesInput): Promise<GetRoutesOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã người dùng (userId).');
    }

    // 1. Kiểm tra / lấy Operator ID của User
    const operatorId = await this.routeRepository.findOperatorIdByUserId(input.userId);
    if (!operatorId) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.',
      );
    }

    // 2. Chuẩn hóa phân trang & sắp xếp
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));
    const sortBy = input.sortBy || 'createdAt';
    const sortOrder = input.sortOrder || 'desc';

    let statusFilter: RouteStatus | undefined;
    if (input.status && (input.status === RouteStatus.ACTIVE || input.status === RouteStatus.INACTIVE)) {
      statusFilter = input.status as RouteStatus;
    }

    // 3. Truy vấn danh sách tuyến đường kèm phân trang & tìm kiếm
    const queryResult = await this.routeRepository.findManyByOperatorId({
      operatorId,
      search: input.search,
      status: statusFilter,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    const totalPages = Math.ceil(queryResult.total / limit) || 1;

    // 4. Map kết quả trả về DTO
    return {
      pagination: {
        page,
        limit,
        totalItems: queryResult.total,
        totalPages,
      },
      data: queryResult.routes.map((route) => ({
        id: route.id!,
        operatorId: route.operatorId,
        origin: route.origin,
        destination: route.destination,
        status: route.status,
        stops: route.stops.map((stop) => ({
          id: stop.id!,
          name: stop.name,
          order: stop.order,
        })),
        createdAt: route.createdAt!,
        updatedAt: route.updatedAt!,
      })),
    };
  }
}
