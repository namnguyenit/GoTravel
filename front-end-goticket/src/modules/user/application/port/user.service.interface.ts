import type { UserProfileEntity } from "../../domain/entity/user-profile.entity";

export interface UpdateProfileDTO {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
}

export interface IUserService {
  getProfile(): Promise<UserProfileEntity>;
  updateProfile(dto: UpdateProfileDTO): Promise<UserProfileEntity>;
}
