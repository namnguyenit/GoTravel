import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { StaffAccountPort } from '../application/staff-account.port';

@Injectable()
export class HttpStaffAccount implements StaffAccountPort {
  async isActive(userId: string): Promise<boolean> {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Chưa cấu hình xác thực nội bộ');
    try {
      const base = process.env.IDENTITY_INTERNAL_URL || 'http://127.0.0.1:8080';
      const response = await fetch(base + '/api/users/internal/' + encodeURIComponent(userId) + '/status', {
        headers: { 'x-internal-service-token': token },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Identity unavailable');
      const body = await response.json() as { data?: { isAllowed?: boolean } };
      return body.data?.isAllowed === true;
    } catch {
      throw new ServiceUnavailableException('Không kiểm tra được nhân viên với Identity');
    }
  }
}
