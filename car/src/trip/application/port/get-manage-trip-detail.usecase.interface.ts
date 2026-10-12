export interface IGetManageTripDetailUseCase {
  execute(tripId: string, userId: string): Promise<any>;
}
