import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key(): string {
  const signingKey = process.env.TICKET_SIGNING_KEY;
  if (!signingKey || signingKey.length < 32) {
    throw new ServiceUnavailableException('Chưa cấu hình khóa ký vé');
  }
  return signingKey;
}

export function ticketToken(ticketId: string, orderItemId: string): string {
  const signature = createHmac('sha256', key()).update(ticketId + ':' + orderItemId).digest('base64url');
  return ticketId + '.' + orderItemId + '.' + signature;
}

export function ticketTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTicketToken(token: string): { ticketId: string; orderItemId: string } {
  if (!token || token.length > 256) throw new UnauthorizedException('Vé không hợp lệ');
  const parts = token.split('.');
  if (parts.length !== 3 || !UUID.test(parts[0]) || !UUID.test(parts[1])) {
    throw new UnauthorizedException('Vé không hợp lệ');
  }
  const expected = ticketToken(parts[0], parts[1]);
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new UnauthorizedException('Vé không hợp lệ');
  }
  return { ticketId: parts[0], orderItemId: parts[1] };
}
