import { CreateRouteInput } from '../dto/create-route.input';
import { CreateRouteOutput } from '../dto/create-route.output';

export interface ICreateRouteUseCase {
  execute(input: CreateRouteInput): Promise<CreateRouteOutput>;
}
