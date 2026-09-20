import { IsEnum, IsNotEmpty } from 'class-validator';
import { RouteStatus } from '../../domain/value-object/route-status.enum';

export class UpdateRouteStatusDto {
  @IsNotEmpty({ message: 'Trạng thái tuyến đường không được để trống.' })
  @IsEnum(RouteStatus, {
    message: 'Trạng thái tuyến đường phải là ACTIVE hoặc INACTIVE.',
  })
  status: RouteStatus;
}
