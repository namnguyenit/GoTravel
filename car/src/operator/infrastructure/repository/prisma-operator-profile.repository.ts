import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  OperatorProfilePatch as UpdateOperatorProfileDto,
  OperatorStatusPatch as UpdateOperatorStatusDto,
  OperatorProfileRepository,
  OperatorProvisionInput,
} from '../../domain/repository/operator-profile.repository';

@Injectable()
export class PrismaOperatorProfileRepository implements OperatorProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async provision(input: OperatorProvisionInput) {
    const operator = (await this.prisma.operator.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        name: input.companyName,
        displayName: input.companyName,
        logoUrl: input.logoUrl || null,
        contactPhone: input.contactPhone || null,
        contactAddress: input.companyAddress || null,
        status: 'ACTIVE',
      } as any,
      update: {
        ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
        name: input.companyName,
        contactPhone: input.contactPhone || null,
        contactAddress: input.companyAddress || null,
        status: 'ACTIVE',
      } as any,
    })) as any;

    await (this.prisma as any).transportAudit.create({
      data: {
        actorId: input.userId,
        action: 'PROVISION_OPERATOR_FROM_IDENTITY',
        detail: { operatorId: operator.id },
      },
    });
    return {
      id: operator.id,
      userId: operator.userId,
      name: operator.name,
      status: operator.status,
    };
  }

  async getPublicProfile(operatorId: string) {
    const operator = (await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: {
        id: true,
        name: true,
        status: true,
        displayName: true,
        logoUrl: true,
        contactPhone: true,
        contactAddress: true,
        description: true,
      } as any,
    })) as any;

    if (!operator) throw new NotFoundException('Không tìm thấy nhà xe');

    return {
      id: operator.id,
      name: operator.name,
      displayName: operator.displayName ?? operator.name,
      logoUrl: operator.logoUrl ?? null,
      contactPhone: operator.contactPhone ?? null,
      contactAddress: operator.contactAddress ?? null,
      description: operator.description ?? null,
      status: operator.status,
    };
  }

  async getMyProfile(userId: string) {
    const operator = (await this.prisma.operator.findFirst({
      where: { userId },
    })) as any;

    if (!operator)
      throw new NotFoundException('Tài khoản chưa có nhà xe được liên kết');

    return {
      id: operator.id,
      name: operator.name,
      displayName: operator.displayName ?? operator.name,
      logoUrl: operator.logoUrl ?? null,
      contactPhone: operator.contactPhone ?? null,
      contactAddress: operator.contactAddress ?? null,
      description: operator.description ?? null,
      status: operator.status,
      createdAt: operator.createdAt,
      updatedAt: operator.updatedAt,
    };
  }

  private async assertUploadedLogo(userId: string, value: string) {
    try {
      const url = new URL(value);
      const cloud = process.env.OPERATOR_LOGO_CLOUD_NAME;
      const path = decodeURIComponent(url.pathname);
      if (
        !cloud ||
        url.protocol !== 'https:' ||
        url.hostname !== 'res.cloudinary.com' ||
        url.port ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error();
      const prefix = `/${cloud}/image/upload/`;
      if (!path.startsWith(prefix)) throw new Error();
      const asset = path.slice(prefix.length).replace(/^v[0-9]+\//, '');
      if (
        !['transport', 'admins', 'enterprises'].some((scope) =>
          asset.startsWith(`${scope}/${userId}/operator-logos/`),
        ) ||
        !/\.(?:webp|png|jpe?g)$/i.test(asset)
      )
        throw new Error();
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'error',
        signal: AbortSignal.timeout(6000),
      });
      if (
        !response.ok ||
        !/^image\/(?:webp|png|jpe?g)(?:;|$)/i.test(
          response.headers.get('content-type') || '',
        )
      )
        throw new Error();
    } catch {
      throw new BadRequestException(
        'Logo phải là ảnh được tải từ máy qua mục chọn logo của chính nhà xe. Vui lòng chọn ảnh và thử lại.',
      );
    }
  }

  async updateMyProfile(userId: string, dto: UpdateOperatorProfileDto) {
    const operator = (await this.prisma.operator.findFirst({
      where: { userId },
    })) as any;

    if (!operator)
      throw new NotFoundException('Tài khoản chưa có nhà xe được liên kết');

    const logo = dto.logoUrl !== undefined ? dto.logoUrl : operator.logoUrl;
    if (typeof logo !== 'string' || !logo.trim())
      throw new BadRequestException(
        'Vui lòng chọn và tải logo nhà xe trước khi lưu hồ sơ.',
      );
    if (logo !== operator.logoUrl) await this.assertUploadedLogo(userId, logo);

    const updated = (await this.prisma.operator.update({
      where: { id: operator.id },
      data: {
        displayName:
          dto.displayName !== undefined
            ? dto.displayName
            : operator.displayName,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : operator.logoUrl,
        contactPhone:
          dto.contactPhone !== undefined
            ? dto.contactPhone
            : operator.contactPhone,
        contactAddress:
          dto.contactAddress !== undefined
            ? dto.contactAddress
            : operator.contactAddress,
        description:
          dto.description !== undefined
            ? dto.description
            : operator.description,
      } as any,
    })) as any;

    await (this.prisma as any).transportAudit.create({
      data: {
        actorId: userId,
        action: 'UPDATE_OPERATOR_PROFILE',
        detail: { operatorId: operator.id, ...dto },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName ?? updated.name,
      logoUrl: updated.logoUrl,
      contactPhone: updated.contactPhone,
      contactAddress: updated.contactAddress,
      description: updated.description,
      status: updated.status,
    };
  }

  async updateStatus(
    operatorId: string,
    adminUserId: string,
    dto: UpdateOperatorStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM operators WHERE id = ${operatorId} FOR UPDATE`;

      const operator = (await tx.operator.findUnique({
        where: { id: operatorId },
      })) as any;

      if (!operator) throw new NotFoundException('Không tìm thấy nhà xe');

      // Update operator status
      const updated = (await tx.operator.update({
        where: { id: operatorId },
        data: { status: dto.status } as any,
      })) as any;

      // Durable safe suspension:
      // When suspended, stop sale on active trips
      let stoppedTripsCount = 0;
      if (dto.status === 'SUSPENDED') {
        const result = await tx.trip.updateMany({
          where: {
            operatorId,
            status: { in: ['PUBLISHING', 'ON_SALE'] },
          },
          data: {
            status: 'STOP_SALE',
            inventorySyncVersion: { increment: 1 },
          } as any,
        });
        stoppedTripsCount = result.count;
      }

      await (tx as any).transportAudit.create({
        data: {
          actorId: adminUserId,
          action:
            dto.status === 'SUSPENDED'
              ? 'SUSPEND_OPERATOR'
              : 'ACTIVATE_OPERATOR',
          detail: {
            operatorId,
            status: dto.status,
            reason: dto.reason ?? null,
            stoppedTripsCount,
          },
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        stoppedTripsCount,
      };
    });
  }
}
