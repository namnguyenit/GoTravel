import type {
  IUserService,
  UpdateProfileDTO,
} from "../port/user.service.interface";
import { UserProfileEntity } from "../../domain/entity/user-profile.entity";
import { httpClient, type IHttpClient } from "@/shared/infrastructure/http/HttpPort";

export class UserService implements IUserService {
  private readonly http: IHttpClient;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async getProfile(): Promise<UserProfileEntity> {
    const raw = await this.http.get<any>("/api/v1/me");
    const profile = raw.userProfile || {};

    return new UserProfileEntity({
      id: raw.id || "usr_me",
      username: raw.username || "user",
      email: raw.email || "",
      fullName: profile.fullName || raw.fullName || raw.username || "Người dùng",
      phoneNumber: profile.phoneNumber || raw.phoneNumber || "",
      address: profile.address || raw.address || "",
      role: Array.isArray(raw.roles) ? raw.roles[0] : raw.role || "USER",
      avatarUrl: profile.avatarUrl || raw.avatarUrl,
      createdAt: raw.createdAt || new Date().toISOString(),
    });
  }

  async updateProfile(dto: UpdateProfileDTO): Promise<UserProfileEntity> {
    await this.http.put<any>("/api/v1/me/profile", dto);
    return this.getProfile();
  }
}
