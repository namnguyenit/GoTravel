import test from "node:test";
import assert from "node:assert/strict";
import { cookieOptions } from "../src/gateway/session.routes.js";
import { setRegistry } from "../src/gateway/configuration.js";
import { createRouteRegistry } from "../src/gateway/route-registry.js";

test("sessions select only configured cookie domains for both sites and local proxies", () => {
  const registry = createRouteRegistry({ dbPath: ":memory:" });
  setRegistry(registry);
  const options = (hostname, origin) => cookieOptions({ hostname, secure: false, get: key => key === "origin" ? origin : undefined });
  assert.equal(options("api.trungcaodev.io.vn", "https://sso.trungcaodev.io.vn").domain, "trungcaodev.io.vn");
  assert.equal(options("localhost", "https://sso.trungcaodev.io.vn").domain, "trungcaodev.io.vn");
  assert.equal(options("localhost", "https://auth.nonnet123.io.vn").domain, "nonnet123.io.vn");
  assert.equal(options("localhost", "https://sso.trungcaodev.io.vn").secure, true);
  assert.equal(options("localhost", "http://localhost:3335").domain, undefined);
  assert.equal(options("localhost", "https://sso.trungcaodev.io.vn.evil.example").domain, undefined);
  assert.equal(options("localhost", "https://evil.trungcaodev.io.vn").domain, undefined);
  assert.equal(options("api.trungcaodev.io.vn", "https://auth.nonnet123.io.vn").domain, "trungcaodev.io.vn");
  const before = registry.snapshot();
  assert.throws(() => registry.mutate(before.version, config => ({ ...config, settings: { ...config.settings, cookieDomains: ["https://evil.example"] } }), "test", "invalid domain"));
  assert.equal(registry.version(), before.version);
  registry.close();
  setRegistry(undefined);
});
