export interface OperatorOutput {
  id: string;
  userId: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
}
