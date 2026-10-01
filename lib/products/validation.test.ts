import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProduct } from "./validation";

const valid = { sku: "LS-0001", name: "Cleanser A", price: "390" };

test("accepts the minimum required fields", () => {
  const r = validateProduct(valid);
  assert.equal(r.issues.length, 0);
  assert.equal(r.data?.price, "390.00");
  assert.equal(r.data?.status, null);
});

test("lower-case sku is fixed, not rejected", () => {
  const r = validateProduct({ ...valid, sku: " ls-0012 " });
  assert.equal(r.data?.sku, "LS-0012");
  assert.deepEqual(r.fixes, [{ field: "sku", kind: "case", from: "ls-0012", to: "LS-0012" }]);
});

test("missing sku is an error even when other columns are filled", () => {
  const r = validateProduct({ ...valid, sku: "" });
  assert.equal(r.data, null);
  assert.deepEqual(r.issues.map((i) => [i.field, i.kind]), [["sku", "missing"]]);
});

test("bad sku shape is a format error", () => {
  for (const sku of ["LS12", "ABC-0001", "LS-00001", "LS 0001"]) {
    const r = validateProduct({ ...valid, sku });
    assert.equal(r.issues[0]?.kind, "format", sku);
  }
});

test("price 0, negative and text are rejected with the right kind", () => {
  assert.equal(validateProduct({ ...valid, price: "0" }).issues[0].kind, "range");
  assert.equal(validateProduct({ ...valid, price: "-5" }).issues[0].kind, "range");
  assert.equal(validateProduct({ ...valid, price: "ราคาพิเศษ" }).issues[0].kind, "type");
  assert.equal(validateProduct({ ...valid, price: "12.345" }).issues[0].kind, "range");
  assert.equal(validateProduct({ ...valid, price: "" }).issues[0].kind, "missing");
});

test("currency symbols and commas in price are cleaned", () => {
  const r = validateProduct({ ...valid, price: "฿1,290 บาท" });
  assert.equal(r.data?.price, "1290.00");
  assert.equal(r.fixes[0].kind, "clean");
});

test("status accepts any case but not guesses like yes", () => {
  assert.equal(validateProduct({ ...valid, status: "Active" }).data?.status, "ACTIVE");
  assert.equal(validateProduct({ ...valid, status: "INACTIVE" }).data?.status, "INACTIVE");
  const r = validateProduct({ ...valid, status: "yes" });
  assert.equal(r.data, null);
  assert.equal(r.issues[0].kind, "format");
});

test("category is matched case-insensitively against the fixed list", () => {
  assert.equal(validateProduct({ ...valid, category: "serum" }).data?.category, "Serum");
  assert.equal(validateProduct({ ...valid, category: "Perfume" }).issues[0].kind, "format");
  assert.equal(validateProduct({ ...valid, category: "" }).data?.category, null);
});

test("reports every problem in a row at once", () => {
  const r = validateProduct({ sku: "", name: "", price: "ฟรี", status: "yes" });
  assert.deepEqual(
    r.issues.map((i) => i.field),
    ["sku", "name", "price", "status"],
  );
});
