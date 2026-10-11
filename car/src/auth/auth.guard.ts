import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createPublicKey, timingSafeEqual, verify, type JsonWebKey } from 'node:crypto';
import type { AuthenticatedRequest } from './auth-user';
import { PUBLIC_ROUTE } from './public.decorator';
import { INTERNAL_ROUTE } from './internal.decorator';

type Claims = {
  sub?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  nbf?: unknown;
  scope?: unknown;
};

type Jwk = JsonWebKey & { kid?: string; kty?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: { keys: Jwk[]; expiresAt: number } | null = null;
  private readonly identityUrl =
    process.env.IDENTITY_INTERNAL_URL || 'http://127.0.0.1:8080';

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.reflector.getAllAndOverride<boolean>(INTERNAL_ROUTE, [
      context.getHandler(), context.getClass(),
    ])) {
      const configured = process.env.INTERNAL_SERVICE_TOKEN;
      const supplied = request.headers['x-internal-service-token'];
      if (!configured || typeof supplied !== 'string') throw new UnauthorizedException();
      const left = Buffer.from(configured);
      const right = Buffer.from(supplied);
      if (left.length !== right.length || !timingSafeEqual(left, right)) {
        throw new UnauthorizedException();
      }
      return true;
    }
    const header = request.headers.authorization;
    if (!header || !/^Bearer [^\s]+$/.test(header)) {
      throw new UnauthorizedException('Thiếu access token');
    }
    const token = header.slice(7);
    const claims = await this.verifyJwt(token);
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 200) {
      throw new UnauthorizedException('Access token không hợp lệ');
    }
    const roles = new Set(
      typeof claims.scope === 'string' ? claims.scope.split(/\s+/).filter(Boolean) : [],
    );
    await this.verifyAccountStatus(claims.sub, roles);
    request.authUser = { id: claims.sub, roles };
    return true;
  }

  private async verifyJwt(token: string): Promise<Claims> {
    if (token.length > 12000) throw new UnauthorizedException('Access token không hợp lệ');
    const pieces = token.split('.');
    if (pieces.length !== 3) throw new UnauthorizedException('Access token không hợp lệ');
    try {
      const header = JSON.parse(Buffer.from(pieces[0], 'base64url').toString()) as {
        alg?: string;
        kid?: string;
      };
      const claims = JSON.parse(Buffer.from(pieces[1], 'base64url').toString()) as Claims;
      if (header.alg !== 'RS256' || !header.kid) {
        throw new UnauthorizedException('Access token không hợp lệ');
      }
      const key = (await this.getKeys()).find(
        (candidate) => candidate.kid === header.kid && candidate.kty === 'RSA',
      );
      if (!key) throw new UnauthorizedException('Không tìm thấy khóa xác thực');
      const valid = verify(
        'RSA-SHA256',
        Buffer.from(pieces[0] + '.' + pieces[1]),
        createPublicKey({ key, format: 'jwk' }),
        Buffer.from(pieces[2], 'base64url'),
      );
      const now = Math.floor(Date.now() / 1000);
      if (
        !valid ||
        claims.iss !== 'com.gotravel.identity' ||
        !(
          claims.aud === 'gotravel-api' ||
          (Array.isArray(claims.aud) && claims.aud.includes('gotravel-api'))
        ) ||
        typeof claims.exp !== 'number' ||
        claims.exp <= now ||
        (typeof claims.nbf === 'number' && claims.nbf > now)
      ) {
        throw new UnauthorizedException('Access token không hợp lệ hoặc đã hết hạn');
      }
      return claims;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new UnauthorizedException('Access token không hợp lệ');
    }
  }

  private async getKeys(): Promise<Jwk[]> {
    if (this.jwks && this.jwks.expiresAt > Date.now()) return this.jwks.keys;
    try {
      const response = await fetch(this.identityUrl + '/.well-known/jwks.json', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('JWKS unavailable');
      const data = (await response.json()) as { keys?: Jwk[] };
      if (!Array.isArray(data.keys)) throw new Error('Invalid JWKS');
      this.jwks = { keys: data.keys, expiresAt: Date.now() + 5 * 60_000 };
      return data.keys;
    } catch {
      throw new ServiceUnavailableException('Không xác thực được với Identity');
    }
  }

  private async verifyAccountStatus(userId: string, roles: Set<string>): Promise<void> {
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (!internalToken) {
      throw new ServiceUnavailableException('Chưa cấu hình xác thực nội bộ');
    }
    try {
      const response = await fetch(
        this.identityUrl + '/api/users/internal/' + encodeURIComponent(userId) + '/status',
        {
          headers: { 'x-internal-service-token': internalToken },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) throw new Error('Identity status unavailable');
      const payload = (await response.json()) as {
        data?: { isAllowed?: boolean; ticketVendorApprovalStatus?: string };
      };
      if (!payload.data?.isAllowed) throw new ForbiddenException('Tài khoản không hoạt động');
      if (
        (roles.has('ROLE_TICKET_VENDOR') || roles.has('TICKET_VENDOR')) &&
        payload.data.ticketVendorApprovalStatus !== 'APPROVED'
      ) {
        throw new ForbiddenException('Nhà xe chưa được duyệt');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new ServiceUnavailableException('Không kiểm tra được trạng thái tài khoản');
    }
  }
}
