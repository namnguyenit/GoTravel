import type { UserSession } from '../domain/entity/user-session.entity';

export function accountHome(user: UserSession): string {
  if (user.isAdmin()) return '/admin';
  if (user.isVendor()) return '/operator';
  if (user.isStaff()) return '/staff/trips';
  return '/';
}

export function safeReturnPath(value?: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://goticket.invalid');
    if (url.origin !== 'https://goticket.invalid' || url.username || url.password) return null;
    if (/^\/(?:login|register|logout|auth)(?:\/|$)/i.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

/** An explicit booking return is kept; a stale portal return is checked against the NEW account. */
export function loginDestination(user: UserSession, requested?: string | null): string {
  const path = safeReturnPath(requested);
  if (!path || path === '/') return accountHome(user);
  const pathname = new URL(path, 'https://goticket.invalid').pathname;
  if (pathname === '/become-operator' || pathname === '/operator/register') {
    return user.isAdmin() || user.isVendor() ? accountHome(user) : path;
  }
  if (user.isAdmin() && /^\/(?:operator|staff)(?:\/|$)/.test(pathname)) return accountHome(user);
  if (/^\/admin(?:\/|$)/.test(pathname)) return user.isAdmin() ? path : accountHome(user);
  if (/^\/operator(?:\/|$)/.test(pathname)) return user.isVendor() ? path : accountHome(user);
  if (/^\/staff(?:\/|$)/.test(pathname)) return user.isStaff() || user.isVendor() ? path : accountHome(user);
  if (/^\/(?:search|trips|account|checkout|payment|profile)(?:\/|$)/.test(pathname)) return path;
  return accountHome(user);
}
