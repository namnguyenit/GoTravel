import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

const defaults = [
  { code: 'STANDARD', label: 'Tiêu chuẩn' },
  { code: 'VIP', label: 'VIP' },
  { code: 'LUXURY', label: 'Cao cấp' },
];

@Injectable()
export class SeatClassService {
  constructor(private readonly prisma: PrismaService) {}
  private async owner(userId: string) {
    const operator = await this.prisma.operator.findUnique({ where: { userId } });
    if (!operator) throw new NotFoundException('Không tìm thấy nhà xe');
    return operator.id;
  }
  async list(userId: string) {
    const operatorId = await this.owner(userId);
    const [saved, existing] = await Promise.all([
      this.prisma.operatorSeatClass.findMany({ where: { operatorId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.seatTemplate.findMany({ where: { car: { operatorId } }, distinct: ['seatClass'], select: { seatClass: true } }),
    ]);
    return [...new Map([...defaults, ...existing.map(s => ({ code: s.seatClass, label: s.seatClass })), ...saved].map(s => [s.code, { code: s.code, label: s.label }])).values()]
      .map(s => ({ ...s, label: defaults.find(d => d.code === s.code)?.label ?? s.label }));
  }
  async create(userId: string, code: string, label: string) {
    const operatorId = await this.owner(userId);
    code = code.trim().toUpperCase(); label = label.trim();
    if (!/^[A-Z0-9_]{1,32}$/.test(code) || !label || label.length > 80)
      throw new BadRequestException('Mã hạng gồm chữ A–Z, số, dấu gạch dưới; tên hạng tối đa 80 ký tự.');
    if (defaults.some(s => s.code === code)) throw new BadRequestException('Hạng ghế này đã có sẵn.');
    return this.prisma.operatorSeatClass.upsert({
      where: { operatorId_code: { operatorId, code } },
      create: { id: randomUUID(), operatorId, code, label }, update: { label },
    });
  }
}
