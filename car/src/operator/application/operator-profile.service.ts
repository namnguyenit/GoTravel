import { Inject, Injectable } from '@nestjs/common';
import type {
  OperatorProfileRepository,
  OperatorProfilePatch,
  OperatorStatusPatch,
  OperatorProvisionInput,
} from '../domain/repository/operator-profile.repository';
@Injectable()
export class OperatorProfileService {
  constructor(
    @Inject('OperatorProfileRepository')
    private readonly profiles: OperatorProfileRepository,
  ) {}
  getPublicProfile(id: string) {
    return this.profiles.getPublicProfile(id);
  }
  getMyProfile(user: string) {
    return this.profiles.getMyProfile(user);
  }
  updateMyProfile(user: string, patch: OperatorProfilePatch) {
    return this.profiles.updateMyProfile(user, patch);
  }
  updateStatus(id: string, actor: string, patch: OperatorStatusPatch) {
    return this.profiles.updateStatus(id, actor, patch);
  }
  provision(input: OperatorProvisionInput) {
    return this.profiles.provision(input);
  }
}
