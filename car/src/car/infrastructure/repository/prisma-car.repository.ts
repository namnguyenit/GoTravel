import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ICarRepository,
  CarFilterParams,
  CarListQueryResult,
  CarDetailResult,
} from '../../domain/repository/car.repository.interface';
import { Car } from '../../domain/entity/car.entity';
import { PrismaService } from '../../../prisma/prisma.service';
import { CarMapper } from '../mapper/car.mapper';
import { CarType } from '../../domain/value-object/car-type.enum';

@Injectable()
export class PrismaCarRepository implements ICarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async mutateOwned(
    id: string,
    ownerUserId: string,
    mutate: (car: Car) => void,
    requireNoActiveTrips: boolean,
  ): Promise<Car> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cars WHERE id = ${id} FOR UPDATE`;
      const row = await tx.car.findUnique({
        where: { id },
        include: { operator: true },
      });
      if (!row || row.operator.userId !== ownerUserId)
        throw new NotFoundException('Không tìm thấy xe thuộc nhà xe');
      if (
        requireNoActiveTrips &&
        (await tx.trip.count({
          where: {
            carId: id,
            status: {
              in: [
                'PUBLISHING',
                'ON_SALE',
                'STOP_SALE',
                'SCHEDULED',
                'DEPARTED',
              ],
            },
          },
        }))
      ) {
        throw new ConflictException(
          'Xe đang có chuyến đã công bố hoặc đang hoạt động',
        );
      }
      const car = CarMapper.toDomain(row);
      mutate(car);
      const data = CarMapper.toPersistence(car);
      const duplicate = await tx.car.findFirst({
        where: { licensePlate: data.licensePlate, id: { not: id } },
      });
      if (duplicate) throw new ConflictException('Biển số xe đã được đăng ký');
      const saved = await tx.car.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          status: data.status,
          licensePlate: data.licensePlate,
        },
      });
      return CarMapper.toDomain(saved);
    });
  }

  async save(car: Car): Promise<Car> {
    const rawData = CarMapper.toPersistence(car);

    const savedModel = await this.prisma.car.upsert({
      where: { id: rawData.id || '' },
      create: {
        operatorId: rawData.operatorId,
        name: rawData.name,
        type: rawData.type,
        status: rawData.status,
        licensePlate: rawData.licensePlate,
        totalSeats: rawData.totalSeats,
      },
      update: {
        name: rawData.name,
        type: rawData.type,
        status: rawData.status,
        licensePlate: rawData.licensePlate,
        totalSeats: rawData.totalSeats,
      },
    });

    return CarMapper.toDomain(savedModel);
  }

  async findByLicensePlate(licensePlate: string): Promise<Car | null> {
    const normalizedPlate = licensePlate.trim().toUpperCase();
    const model = await this.prisma.car.findUnique({
      where: { licensePlate: normalizedPlate },
    });

    if (!model) {
      return null;
    }

    return CarMapper.toDomain(model);
  }

  async findById(id: string): Promise<Car | null> {
    const model = await this.prisma.car.findUnique({
      where: { id },
    });

    if (!model) {
      return null;
    }

    return CarMapper.toDomain(model);
  }

  async findByIdWithSeats(id: string): Promise<CarDetailResult | null> {
    const model = await this.prisma.car.findUnique({
      where: { id },
      include: {
        seatTemplates: {
          orderBy: [{ level: 'asc' }, { code: 'asc' }],
        },
      },
    });

    if (!model) {
      return null;
    }

    return {
      car: CarMapper.toDomain(model),
      seatTemplates: model.seatTemplates.map((st) => ({
        id: st.id,
        code: st.code,
        level: st.level,
        seatClass: st.seatClass,
        active: st.active,
      })),
    };
  }

  async countActiveTripsByCarId(carId: string): Promise<number> {
    return this.prisma.trip.count({
      where: {
        carId,
        status: {
          in: ['PUBLISHING', 'ON_SALE', 'STOP_SALE', 'SCHEDULED', 'DEPARTED'],
        },
      },
    });
  }

  async findOperatorIdByUserId(userId: string): Promise<string | null> {
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
    });

    return operator ? operator.id : null;
  }

  async findManyWithFilters(
    params: CarFilterParams,
  ): Promise<CarListQueryResult> {
    const {
      operatorId,
      keyword,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = params;

    // Build WHERE clause
    const where: Prisma.CarWhereInput = {
      operatorId,
    };

    if (type) {
      where.type = type as unknown as Prisma.EnumCarTypeFilter;
    }

    if (keyword && keyword.trim() !== '') {
      const trimmedKeyword = keyword.trim();
      where.OR = [
        { name: { contains: trimmedKeyword, mode: 'insensitive' } },
        { licensePlate: { contains: trimmedKeyword, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Execute queries concurrently for performance
    const [carModels, totalCount, kpiSleeper, kpiLimousine, kpiSeat] =
      await Promise.all([
        this.prisma.car.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        this.prisma.car.count({ where }),
        this.prisma.car.count({
          where: { operatorId, type: CarType.SLEEPER as any },
        }),
        this.prisma.car.count({
          where: { operatorId, type: CarType.LIMOUSINE as any },
        }),
        this.prisma.car.count({
          where: { operatorId, type: CarType.SEAT as any },
        }),
      ]);

    const totalCars = kpiSleeper + kpiLimousine + kpiSeat;

    return {
      cars: carModels.map(CarMapper.toDomain),
      total: totalCount,
      kpi: {
        totalCars,
        sleeperCars: kpiSleeper,
        limousineCars: kpiLimousine,
        seatCars: kpiSeat,
      },
    };
  }
}
