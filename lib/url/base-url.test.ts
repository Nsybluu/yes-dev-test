import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBaseUrl } from "./base-url";

test("unset APP_URL falls back to localhost without complaining", () => {
  for (const v of [undefined, "", "   "]) {
    const r = parseBaseUrl(v);
    assert.deepEqual([r.url, r.kind, r.addedScheme, r.invalid], ["http://localhost:3000", "localhost", false, false]);
  }
});

test("the exact value that broke the QR codes: an IP and port with no http://", () => {
  const r = parseBaseUrl("172.20.10.2:3000");
  assert.equal(r.url, "http://172.20.10.2:3000");
  assert.equal(r.addedScheme, true);
  assert.equal(r.kind, "lan");
});

test("a bare domain gets https, an IP or localhost gets http", () => {
  assert.equal(parseBaseUrl("shop.example.com").url, "https://shop.example.com");
  assert.equal(parseBaseUrl("localhost:3000").url, "http://localhost:3000");
  assert.equal(parseBaseUrl("192.168.1.20:3000").url, "http://192.168.1.20:3000");
  assert.equal(parseBaseUrl("my-mac.local:3000").url, "http://my-mac.local:3000");
});

test("a correct value is kept as is, minus trailing slashes and quotes", () => {
  assert.equal(parseBaseUrl("https://shop.example.com/").url, "https://shop.example.com");
  assert.equal(parseBaseUrl('"http://192.168.1.20:3000"').url, "http://192.168.1.20:3000");
  assert.equal(parseBaseUrl("https://shop.example.com").addedScheme, false);
});

test("classifies where a QR would actually work", () => {
  assert.equal(parseBaseUrl("http://localhost:3000").kind, "localhost");
  assert.equal(parseBaseUrl("http://127.0.0.1:3000").kind, "localhost");
  for (const ip of ["10.0.0.5", "172.16.0.1", "172.31.255.1", "192.168.0.10", "169.254.1.1"]) {
    assert.equal(parseBaseUrl(`http://${ip}:3000`).kind, "lan", ip);
  }
  assert.equal(parseBaseUrl("http://172.32.0.1:3000").kind, "public"); // just outside 172.16/12
  assert.equal(parseBaseUrl("https://abc.trycloudflare.com").kind, "public");
});

test("garbage is reported as invalid and replaced by the default", () => {
  for (const v of ["ftp://example.com", "http://", "http://bad host"]) {
    const r = parseBaseUrl(v);
    assert.equal(r.invalid, true, v);
    assert.equal(r.url, "http://localhost:3000");
  }
});
