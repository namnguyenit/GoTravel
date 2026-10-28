import type {
  IAdminOperatorService,
  GetOperatorsParams,
  GetOperatorsResult,
  ProcessApplicationDTO,
} from "../port/admin-operator.service.interface";
import { OperatorEntity } from "../../domain/entity/operator.entity";
import { AdminUserDetailEntity } from "../../domain/entity/admin-user-detail.entity";
import { OperatorApplicationEntity } from "../../domain/entity/operator-application.entity";
import {
  httpClient,
  type IHttpClient,
} from "@/shared/infrastructure/http/HttpPort";

export class AdminOperatorService implements IAdminOperatorService {
  private readonly http: IHttpClient;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async getOperators(params?: GetOperatorsParams): Promise<GetOperatorsResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    const json = await this.http.get<any>("/api/v1/operators", {
      params: queryParams,
    });
    const rawList = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];
    const items = rawList.map((item: any) => new OperatorEntity(item));

    const pagination = json?.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 10,
      total: items.length,
      totalPages: 1,
    };

    return {
      data: items,
      pagination,
    };
  }

  async getOperatorApplications(
    status = "PENDING",
    pageNumber = 1,
    keyword = ""
  ) {
    const [page, ...counters] = await Promise.all([
      this.http.get<any>("/api/v1/admin/ticket-vendors", {
        params: { status, keyword, page: pageNumber - 1, size: 20 },
      }),
      ...["PENDING", "APPROVED", "REJECTED"].map((status) =>
        this.http.get<any>("/api/v1/admin/ticket-vendors", {
          params: { status, page: 0, size: 1 },
        })
      ),
    ]);
    const counts: Record<string, number> = {};
    ["PENDING", "APPROVED", "REJECTED"].forEach((key, index) => {
      counts[key] = Number(counters[index].totalElements ?? 0);
    });
    counts.ALL = Object.values(counts).reduce(
      (total, count) => total + count,
      0
    );
    const data = (page.content || []).map((user: any) => {
      const profile = user.ticketVendorProfile || {};
      return new OperatorApplicationEntity({
        id: user.id,
        userId: user.id,
        logoUrl: profile.logoUrl || "",
        name: profile.companyName || user.username || "Nhà xe",
        phone: profile.contactPhone || user.userProfile?.phoneNumber || "",
        address: profile.companyAddress || "",
        representativeName: profile.representativeName || "",
        representativeIdNumber: profile.representativeIdNumber || "",
        taxCode: profile.taxCode || "",
        documentFrontUrl: profile.documentFrontUrl || "",
        documentBackUrl: profile.documentBackUrl || "",
        status: profile.approvalStatus || "PENDING",
        rejectReason: profile.rejectionReason || null,
        createdAt: profile.createdAt || user.createdAt || "",
        updatedAt:
          profile.updatedAt || profile.createdAt || user.createdAt || "",
      });
    });
    return {
      data,
      counts,
      totalPages: Number(page.totalPages ?? 0),
      totalElements: Number(page.totalElements ?? 0),
    };
  }

  async processOperatorApplication(dto: ProcessApplicationDTO): Promise<void> {
    await this.http.put<any>(
      `/api/v1/admin/ticket-vendors/${dto.applicationId}/approval`,
      {
        status: dto.status,
        reason: dto.rejectReason,
      }
    );
  }

  async updateOperatorStatus(
    operatorId: string,
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE"
  ): Promise<void> {
    await this.http.patch<any>(`/api/v1/operators/${operatorId}/status`, {
      status,
    });
  }

  async getUserDetailById(userId: string): Promise<AdminUserDetailEntity> {
    const json = await this.http.get<any>(`/api/v1/admin/users/${userId}`);
    const data = json?.data || json;
    return new AdminUserDetailEntity({
      id: data.id || userId,
      email: data.email || "",
      username: data.username || "",
      fullName: data.userProfile?.fullName || data.fullName,
      phoneNumber: data.userProfile?.phoneNumber || data.phoneNumber,
      address: data.userProfile?.address || data.address,
      roles: data.roles || [],
      isActive: data.isActive ?? true,
    });
  }
}
