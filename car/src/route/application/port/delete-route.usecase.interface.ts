export interface DeleteRouteInput {
  routeId: string;
  userId: string;
}

export interface DeleteRouteOutput {
  id: string;
  deleted: boolean;
}

export interface IDeleteRouteUseCase {
  execute(input: DeleteRouteInput): Promise<DeleteRouteOutput>;
}
