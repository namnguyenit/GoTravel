const groups = [
  { home: "https://gotravel.trungcaodev.io.vn", sso: "https://auth.trungcaodev.io.vn", payment: "https://pay.trungcaodev.io.vn" },
  { home: "https://gostay.nonnet123.io.vn", sso: "https://auth.nonnet123.io.vn", payment: "https://pay.nonnet123.io.vn" },
];

export function defaultHome(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
    return `http://${host === "::1" ? "[::1]" : host}:3000`;
  }
  return groups.find(group => new URL(group.sso).hostname === host)?.home || groups[0].home;
}

export function safeRedirect(target: string | null, currentOrigin: string) {
  const fallback = defaultHome(new URL(currentOrigin).hostname);
  if (!target) return fallback;
  try {
    const url = new URL(target, currentOrigin);
    const allowed = [...groups.flatMap(group => Object.values(group)), "https://gotrvel.trungcaodev.io.vn"];
    if (["localhost", "127.0.0.1", "[::1]"].includes(new URL(currentOrigin).hostname)) {
      allowed.push("http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000");
    }
    if (!allowed.includes(url.origin) || url.username || url.password) return fallback;
    return url.href;
  } catch { return fallback; }
}
