import { CreateRouteDto } from '../dto/create-route.dto';
import { GetRoutesQueryDto } from '../dto/get-routes-query.dto';
import { CreateRouteInput } from '../../application/dto/create-route.input';
import { CreateRouteOutput } from '../../application/dto/create-route.output';
import { GetRoutesInput } from '../../application/dto/get-routes.input';
import { GetRoutesOutput } from '../../application/dto/get-routes.output';
import { UpdateRouteStatusOutput } from '../../application/dto/update-route-status.output';

export class RoutePresentationMapper {
  public static toCreateRouteInput(dto: CreateRouteDto, userId: string): CreateRouteInput {
    return {
      userId,
      origin: dto.origin,
      destination: dto.destination,
      stops: (dto.stops || []).map((stop) => ({
        name: stop.name,
        order: stop.order,
      })),
    };
  }

  public static toCreateRouteApiResponse(output: CreateRouteOutput) {
    return {
      success: true,
      code: 'CREATE_ROUTE_SUCCESS',
      message: 'Tạo tuyến đường thành công!',
      data: {
        id: output.id,
        operatorId: output.operatorId,
        origin: output.origin,
        destination: output.destination,
        status: output.status,
        stops: output.stops,
        createdAt: output.createdAt,
        updatedAt: output.updatedAt,
      },
    };
  }

  public static toGetRoutesInput(query: GetRoutesQueryDto, userId: string): GetRoutesInput {
    return {
      userId,
      search: query.search,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
    };
  }

  public static toGetRoutesApiResponse(output: GetRoutesOutput) {
    return {
      success: true,
      code: 'GET_ROUTES_SUCCESS',
      message: 'Lấy danh sách tuyến đường thành công.',
      data: {
        pagination: output.pagination,
        data: output.data,
      },
    };
  }

  public static toUpdateRouteStatusApiResponse(output: UpdateRouteStatusOutput) {
    return {
      success: true,
      code: 'UPDATE_ROUTE_STATUS_SUCCESS',
      message: 'Cập nhật trạng thái tuyến đường thành công!',
      data: {
        id: output.id,
        operatorId: output.operatorId,
        origin: output.origin,
        destination: output.destination,
        status: output.status,
        createdAt: output.createdAt,
        updatedAt: output.updatedAt,
      },
    };
  }
}
