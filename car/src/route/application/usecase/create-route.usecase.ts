import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ICreateRouteUseCase } from '../port/create-route.usecase.interface';
import { CreateRouteInput } from '../dto/create-route.input';
import { CreateRouteOutput } from '../dto/create-route.output';
import type { IRouteRepository } from '../../domain/repository/route.repository.interface';
import { Route } from '../../domain/entity/route.entity';
import { RouteStop } from '../../domain/entity/route-stop.entity';

@Injectable()
export class CreateRouteUseCase implements ICreateRouteUseCase {
  constructor(
    @Inject('IRouteRepository')
    private readonly routeRepository: IRouteRepository,
  ) {}

  async execute(input: CreateRouteInput): Promise<CreateRouteOutput> {
    if (!input.userId || !input.userId.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mã người dùng (userId).');
    }

    // 1. Kiểm tra / lấy Operator ID thuộc sở hữu của User
    const operatorId = await this.routeRepository.findOperatorIdByUserId(input.userId);
    if (!operatorId) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.',
      );
    }

    // 2. Validate sơ bộ danh sách stops
    if (!input.stops || !Array.isArray(input.stops) || input.stops.length < 2) {
      throw new BadRequestException(
        'Tuyến đường phải có ít nhất 2 điểm dừng (gồm điểm đầu và điểm cuối).',
      );
    }

    // 3. Khởi tạo Domain Entities cho RouteStop
    let stopEntities: RouteStop[];
    try {
      stopEntities = input.stops.map((stop) =>
        RouteStop.create({
          name: stop.name,
          order: stop.order,
        }),
      );
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    // 4. Khởi tạo Domain Entity Route (validate origin, destination, trùng lặp order của stops,...)
    let routeEntity: Route;
    try {
      routeEntity = Route.create({
        operatorId,
        origin: input.origin,
        destination: input.destination,
        stops: stopEntities,
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    // 5. Lưu thông qua Repository contract (Transaction lưu Route và RouteStops)
    const savedRoute = await this.routeRepository.save(routeEntity);

    // 6. Trả về Output DTO
    return {
      id: savedRoute.id!,
      operatorId: savedRoute.operatorId,
      origin: savedRoute.origin,
      destination: savedRoute.destination,
      status: savedRoute.status,
      stops: savedRoute.stops.map((stop) => ({
        id: stop.id!,
        name: stop.name,
        order: stop.order,
      })),
      createdAt: savedRoute.createdAt!,
      updatedAt: savedRoute.updatedAt!,
    };
  }
}
