export interface OperatorProfilePatch {
  displayName?: string;
  logoUrl?: string;
  contactPhone?: string;
  contactAddress?: string;
  description?: string;
}
export interface OperatorStatusPatch {
  status: 'ACTIVE' | 'SUSPENDED';
  reason?: string;
}
export interface OperatorProvisionInput {
  userId: string;
  companyName: string;
  companyAddress?: string | null;
  contactPhone?: string | null;
}
export interface OperatorProfileRepository {
  getPublicProfile(id: string): Promise<any>;
  getMyProfile(userId: string): Promise<any>;
  updateMyProfile(userId: string, patch: OperatorProfilePatch): Promise<any>;
  updateStatus(
    id: string,
    actorId: string,
    patch: OperatorStatusPatch,
  ): Promise<any>;
  provision(input: OperatorProvisionInput): Promise<any>;
}
