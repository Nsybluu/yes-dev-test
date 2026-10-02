import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contrastRatio,
  isScannableBackground,
  normalizeHex,
  parseQrOptions,
  QR_DEFAULT_BACKGROUND,
  QR_DEFAULT_SIZE,
} from "./options";

const params = (init: Record<string, string>) => ({ get: (k: string) => init[k] ?? null });

test("normalizes colour input", () => {
  assert.equal(normalizeHex("FFF"), "#ffffff");
  assert.equal(normalizeHex("#FFEEAA"), "#ffeeaa");
  assert.equal(normalizeHex(" 12ab34 "), "#12ab34");
  for (const bad of ["", "ggg", "12345", "#1234567", "rgb(1,2,3)", null, undefined]) assert.equal(normalizeHex(bad), null, String(bad));
});

test("contrast against black: white is the maximum, black is the minimum", () => {
  assert.ok(Math.abs(contrastRatio("#ffffff", "#000000") - 21) < 0.01);
  assert.equal(contrastRatio("#000000", "#000000"), 1);
});

test("light backgrounds are scannable, dark and mid-dark ones are refused", () => {
  for (const ok of ["#ffffff", "#fff8e7", "#e8f4ff", "#fde68a", "#f4c2c2", "#d1d5db", "#999999"]) {
    assert.equal(isScannableBackground(ok), true, ok);
  }
  for (const bad of ["#000000", "#111111", "#1e3a8a", "#7f1d1d", "#808080", "#555555", "#2563eb"]) {
    assert.equal(isScannableBackground(bad), false, bad);
  }
});

test("no parameters means white at the default size", () => {
  const r = parseQrOptions(params({}));
  assert.deepEqual(r, { ok: true, options: { size: QR_DEFAULT_SIZE, background: QR_DEFAULT_BACKGROUND } });
});

test("accepts a valid size and colour, with or without #", () => {
  assert.deepEqual(parseQrOptions(params({ size: "2000", bg: "fff8e7" })), {
    ok: true,
    options: { size: 2000, background: "#fff8e7" },
  });
  assert.deepEqual(parseQrOptions(params({ bg: "#FDE68A" })), {
    ok: true,
    options: { size: QR_DEFAULT_SIZE, background: "#fde68a" },
  });
});

test("rejects sizes that are not numbers or are out of range", () => {
  for (const size of ["abc", "-5", "10.5", "199", "4001", "999999", "1e3", ""]) {
    assert.equal(parseQrOptions(params({ size })).ok, false, size);
  }
  assert.equal(parseQrOptions(params({ size: "200" })).ok, true);
  assert.equal(parseQrOptions(params({ size: "4000" })).ok, true);
});

test("rejects bad or too-dark colours with a reason", () => {
  const dark = parseQrOptions(params({ bg: "000000" }));
  assert.equal(dark.ok, false);
  assert.match(!dark.ok ? dark.error : "", /เข้มเกินไป/);
  assert.equal(parseQrOptions(params({ bg: "zzz" })).ok, false);
  assert.equal(parseQrOptions(params({ bg: "red" })).ok, false);
});
