import type {
  ICarService,
  GetCarsParams,
  GetCarsResult,
  CreateCarDTO,
} from "../port/car.service.interface";
import { CarEntity } from "../../domain/entity/car.entity";
import { LicensePlateVO } from "../../domain/value-object/license-plate.vo";
import { httpClient, type IHttpClient } from "@/shared/infrastructure/http/HttpPort";
import type { CarStatus } from "../../domain/value-object/car-status.vo";

export class CarService implements ICarService {
  private readonly http: IHttpClient;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async getCars(params?: GetCarsParams): Promise<GetCarsResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.keyword?.trim()) queryParams.keyword = params.keyword.trim();
    if (params?.type?.trim()) queryParams.type = params.type.trim();
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    const responseData = await this.http.get<any>('/api/v1/cars', { params: queryParams });

    const rawList = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
      ? responseData
      : [];

    const carEntities = rawList.map((item: any) => CarEntity.fromApiResponse(item));

    const rawKpi = responseData?.kpi || {};
    const kpi = {
      totalCars: Number(rawKpi.totalCars) || 0,
      sleeperCars: Number(rawKpi.sleeperCars) || 0,
      limousineCars: Number(rawKpi.limousineCars) || 0,
      seatCars: Number(rawKpi.seatCars) || 0,
    };

    const rawPagination = responseData?.pagination || {};
    const pagination = {
      page: Number(rawPagination.page) || params?.page || 1,
      limit: Number(rawPagination.limit) || params?.limit || 10,
      totalItems: Number(rawPagination.totalItems ?? rawPagination.total) || carEntities.length,
      totalPages: Number(rawPagination.totalPages) || 1,
    };

    return {
      data: carEntities,
      kpi,
      pagination,
    };
  }

  async addCar(dto: CreateCarDTO): Promise<CarEntity> {
    const errorMsg = LicensePlateVO.getValidationError(dto.licensePlate);
    if (errorMsg) {
      throw new Error(errorMsg);
    }

    if (!dto.name || !dto.name.trim()) {
      throw new Error("Vui lòng nhập tên xe khách.");
    }

    if (!dto.type) {
      throw new Error("Vui lòng chọn loại xe.");
    }

    const totalSeats = Number(dto.totalSeats);
    if (!Number.isInteger(totalSeats) || totalSeats <= 0 || totalSeats > 100) {
      throw new Error("Số ghế phải là số nguyên từ 1 đến 100.");
    }

    const payload = {
      name: dto.name.trim(),
      licensePlate: LicensePlateVO.normalize(dto.licensePlate),
      type: dto.type,
      totalSeats: totalSeats,
      deckCount: dto.deckCount,
      seatColumns: dto.seatColumns,
      lowerDeckSeats: dto.lowerDeckSeats,
      seatClass: dto.seatClass,
    };

    const createdData = await this.http.post<any>('/api/v1/cars', payload);
    return CarEntity.fromApiResponse(createdData);
  }

  async deleteCar(id: string): Promise<void> {
    await this.http.delete(`/api/v1/cars/${id}`);
  }

  async createCar(dto: CreateCarDTO): Promise<CarEntity> {
    return this.addCar(dto);
  }

  async updateCar(id: string, dto: Partial<Pick<CreateCarDTO, 'name' | 'type' | 'licensePlate'>>): Promise<CarEntity> {
    const payload = { ...dto, licensePlate: dto.licensePlate ? LicensePlateVO.normalize(dto.licensePlate) : undefined };
    return CarEntity.fromApiResponse(await this.http.patch<any>(`/api/v1/cars/${id}`, payload));
  }

  async updateCarStatus(id: string, status: CarStatus): Promise<CarEntity> {
    return CarEntity.fromApiResponse(await this.http.patch<any>(`/api/v1/cars/${id}/status`, { status }));
  }
}
