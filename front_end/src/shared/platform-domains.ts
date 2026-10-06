const currentPlatform = {
  home: "https://gotravel.trungcaodev.io.vn",
  sso: "https://auth.trungcaodev.io.vn",
  payment: "https://pay.trungcaodev.io.vn",
};
const legacyPlatform = {
  home: "https://gostay.nonnet123.io.vn",
  sso: "https://auth.nonnet123.io.vn",
  payment: "https://pay.nonnet123.io.vn",
};

export function platformUrls(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
    return { home: "http://localhost:3000", sso: "http://localhost:3335", payment: "http://localhost:3336" };
  }
  if (["gostay.nonnet123.io.vn", "auth.nonnet123.io.vn", "pay.nonnet123.io.vn"].includes(host)) {
    return legacyPlatform;
  }
  // Public aliases and remote IP access must never point at the visitor's localhost.
  return currentPlatform;
}
