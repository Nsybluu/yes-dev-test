import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeRows, summarize, type ExistingProduct } from "./import-analyze";

const row = (rowNumber: number, values: Record<string, string>) => ({ rowNumber, values });

const existing = new Map<string, ExistingProduct>([
  [
    "LS-0001",
    {
      sku: "LS-0001",
      name: "Cleanser A",
      category: "Cleanser",
      price: "390.00",
      size: "100 ml",
      description: "old description",
      howToUse: null,
      status: "ACTIVE",
    },
  ],
]);

test("classifies new, update, unchanged and error rows", () => {
  const rows = analyzeRows(
    [
      row(2, { sku: "LS-0002", name: "New one", price: "100" }),
      row(3, { sku: "LS-0001", name: "Cleanser A", price: "420" }),
      row(4, { sku: "LS-0001x", name: "Bad", price: "1" }),
    ],
    existing,
  );
  assert.deepEqual(rows.map((r) => r.status), ["new", "update", "error"]);
  assert.deepEqual(rows[1].changes, [{ field: "price", before: "390.00", after: "420.00" }]);
});

test("identical data is reported as unchanged", () => {
  const [r] = analyzeRows([row(2, { sku: "ls-0001", name: "Cleanser A", price: "390" })], existing);
  assert.equal(r.status, "unchanged");
  assert.equal(r.fixes.length, 1); // the lower-case sku was still fixed
});

test("blank cells never count as changes (they must not erase saved data)", () => {
  const [r] = analyzeRows(
    [row(2, { sku: "LS-0001", name: "Cleanser A", price: "390", size: "", description: "", status: "" })],
    existing,
  );
  assert.equal(r.status, "unchanged");
});

test("a new value for a previously empty field is a change", () => {
  const [r] = analyzeRows(
    [row(2, { sku: "LS-0001", name: "Cleanser A", price: "390", howToUse: "use daily" })],
    existing,
  );
  assert.equal(r.status, "update");
  assert.deepEqual(r.changes, [{ field: "howToUse", before: null, after: "use daily" }]);
});

test("same sku twice in the file marks every involved row, even with different case", () => {
  const rows = analyzeRows(
    [
      row(2, { sku: "LS-0005", name: "A", price: "1" }),
      row(3, { sku: "ls-0005", name: "B", price: "2" }),
      row(4, { sku: "LS-0006", name: "C", price: "3" }),
    ],
    new Map(),
  );
  assert.deepEqual(rows.map((r) => r.status), ["error", "error", "new"]);
  assert.equal(rows[0].issues[0].kind, "duplicate");
  assert.match(rows[0].issues[0].message, /แถว 3/);
  assert.match(rows[1].issues[0].message, /แถว 2/);
});

test("summary counts rows, issue kinds and fixes", () => {
  const rows = analyzeRows(
    [
      row(2, { sku: "ls-0010", name: "ok", price: "฿5" }),
      row(3, { sku: "", name: "no sku", price: "ราคาพิเศษ", status: "yes" }),
    ],
    new Map(),
  );
  const s = summarize(rows, 2);
  assert.equal(s.totalRows, 2);
  assert.equal(s.blankRows, 2);
  assert.equal(s.new, 1);
  assert.equal(s.error, 1);
  assert.equal(s.rowsWithFixes, 1);
  assert.deepEqual(s.issueCounts, { missing: 1, type: 1, format: 1, range: 0, duplicate: 0 });
  assert.deepEqual(s.fixCounts, { case: 1, clean: 1 });
});
