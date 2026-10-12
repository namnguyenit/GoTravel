const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Select SSO in the same cookie domain as the application being opened. */
export function ssoOrigin(currentOrigin: string, configuredOrigin?: string): string {
  const current = new URL(currentOrigin);
  const hostname = current.hostname.toLowerCase();
  if (localHosts.has(hostname)) return `${current.protocol}//${current.hostname}:3335`;
  if (hostname === 'nonnet123.io.vn' || hostname.endsWith('.nonnet123.io.vn')) {
    return 'https://auth.nonnet123.io.vn';
  }
  if (hostname === 'trungcaodev.io.vn' || hostname.endsWith('.trungcaodev.io.vn')) {
    return 'https://auth.trungcaodev.io.vn';
  }
  return new URL(configuredOrigin || 'https://auth.trungcaodev.io.vn').origin;
}

export function goTravelOrigin(currentOrigin: string): string {
  const current = new URL(currentOrigin);
  if (localHosts.has(current.hostname)) return `${current.protocol}//${current.hostname}:3000`;
  return current.hostname.endsWith('.nonnet123.io.vn')
    ? 'https://gostay.nonnet123.io.vn'
    : 'https://gotravel.trungcaodev.io.vn';
}

export function buildSsoUrl(currentOrigin: string, returnPath = '/', mode: 'login' | 'register' = 'login', configuredOrigin?: string): string {
  const current = new URL(currentOrigin);
  let destination = new URL('/', current);
  try {
    const candidate = new URL(returnPath, current);
    if (candidate.origin === current.origin && !candidate.username && !candidate.password &&
        !['/login', '/register'].includes(candidate.pathname.replace(/\/$/, ''))) {
      destination = candidate;
    }
  } catch { /* Use the application home for an invalid return path. */ }
  const target = new URL('/', ssoOrigin(currentOrigin, configuredOrigin));
  target.searchParams.set('redirect_uri', destination.href);
  if (mode === 'register') target.searchParams.set('mode', mode);
  return target.href;
}
