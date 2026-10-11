import type { Request } from 'express';

export interface AuthUser {
  id: string;
  roles: ReadonlySet<string>;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.has(role) || user.roles.has('ROLE_' + role);
}
