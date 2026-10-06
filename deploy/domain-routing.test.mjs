import test from "node:test";
import assert from "node:assert/strict";
import { platformUrls } from "../front_end/src/shared/platform-domains.ts";
import { safeRedirect } from "../auth_front-end/src/platform-domains.ts";

test("frontend uses the matching SSO and payment domain", () => {
  assert.equal(platformUrls("gotravel.trungcaodev.io.vn").sso, "https://auth.trungcaodev.io.vn");
  assert.equal(platformUrls("gotravel.trungcaodev.io.vn").payment, "https://pay.trungcaodev.io.vn");
  assert.equal(platformUrls("gostay.nonnet123.io.vn").sso, "https://auth.nonnet123.io.vn");
  assert.equal(platformUrls("gostay.nonnet123.io.vn").payment, "https://pay.nonnet123.io.vn");
  for (const host of ["gotrvel.trungcaodev.io.vn", "www.gotravel.trungcaodev.io.vn", "100.100.181.60", "gotravel.trungcaodev.io.vn.evil.example", "GOTRAVEL.TRUNGCAODEV.IO.VN."]) {
    assert.equal(platformUrls(host).sso, "https://auth.trungcaodev.io.vn");
    assert.equal(platformUrls(host).payment, "https://pay.trungcaodev.io.vn");
  }
  assert.equal(platformUrls("localhost").sso, "http://localhost:3335");
});

test("SSO preserves permitted return URLs and rejects external or credentialed URLs", () => {
  const origin = "https://auth.trungcaodev.io.vn";
  assert.equal(safeRedirect(null, origin), "https://gotravel.trungcaodev.io.vn");
  assert.equal(safeRedirect(null, "https://auth.nonnet123.io.vn"), "https://gostay.nonnet123.io.vn");
  assert.equal(safeRedirect("https://gotravel.trungcaodev.io.vn/orders?x=1", origin), "https://gotravel.trungcaodev.io.vn/orders?x=1");
  for (const bad of ["https://evil.example", "javascript:alert(1)", "https://user:password@gotravel.trungcaodev.io.vn", "https://gotravel.trungcaodev.io.vn.evil.example", "//evil.example"]) {
    assert.equal(safeRedirect(bad, origin), "https://gotravel.trungcaodev.io.vn");
  }
});

test("public SSO never redirects to localhost, including supplied return URLs", () => {
  for (const origin of ["https://auth.trungcaodev.io.vn", "https://sso.trungcaodev.io.vn", "https://unknown.example"]) {
    assert.equal(safeRedirect(null, origin), "https://gotravel.trungcaodev.io.vn");
    for (const target of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000", "http://100.100.181.60:3000"]) {
      assert.equal(safeRedirect(target, origin), "https://gotravel.trungcaodev.io.vn");
    }
  }
  assert.equal(safeRedirect(null, "http://localhost:3335"), "http://localhost:3000");
  assert.equal(safeRedirect("http://127.0.0.1:3000/orders", "http://127.0.0.1:3335"), "http://127.0.0.1:3000/orders");
});
