import { GetRoutesInput } from '../dto/get-routes.input';
import { GetRoutesOutput } from '../dto/get-routes.output';

export interface IGetRoutesUseCase {
  execute(input: GetRoutesInput): Promise<GetRoutesOutput>;
}
