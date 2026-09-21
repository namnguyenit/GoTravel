import { SearchTripsInput } from '../dto/search-trips.input';
import { SearchTripsOutput } from '../dto/search-trips.output';

export interface ISearchTripsUseCase {
  execute(input: SearchTripsInput): Promise<SearchTripsOutput>;
}
