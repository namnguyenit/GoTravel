import { UpdateRouteStatusInput } from '../dto/update-route-status.input';
import { UpdateRouteStatusOutput } from '../dto/update-route-status.output';

export interface IUpdateRouteStatusUseCase {
  execute(input: UpdateRouteStatusInput): Promise<UpdateRouteStatusOutput>;
}
