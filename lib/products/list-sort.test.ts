import assert from "node:assert/strict";
import { test } from "node:test";
import { nextSort, orderByFor, parseSort } from "./list-sort";

test("parses only known columns; anything else means the default order", () => {
  assert.equal(parseSort(undefined, undefined), null);
  assert.equal(parseSort("sku; DROP TABLE", "asc"), null);
  assert.equal(parseSort("id", "asc"), null); // the ID column no longer exists
  assert.equal(parseSort("constructor", "asc"), null); // not an inherited property of the lookup object
  assert.deepEqual(parseSort("name", "desc"), { column: "name", dir: "desc" });
  assert.deepEqual(parseSort(["price"], undefined), { column: "price", dir: "asc" });
  assert.deepEqual(parseSort("sku", "sideways"), { column: "sku", dir: "asc" });
});

test("clicking a header: new column ascending, same column flips", () => {
  assert.deepEqual(nextSort(null, "name"), { column: "name", dir: "asc" });
  assert.deepEqual(nextSort({ column: "name", dir: "asc" }, "name"), { column: "name", dir: "desc" });
  assert.deepEqual(nextSort({ column: "name", dir: "desc" }, "name"), { column: "name", dir: "asc" });
  assert.deepEqual(nextSort({ column: "name", dir: "desc" }, "price"), { column: "price", dir: "asc" });
});

test("builds a stable order for the database", () => {
  assert.deepEqual(orderByFor(null), [{ createdAt: "desc" }, { productId: "asc" }]);
  assert.deepEqual(orderByFor({ column: "price", dir: "desc" }), [{ price: "desc" }, { productId: "asc" }]);
  assert.deepEqual(orderByFor({ column: "sku", dir: "desc" }), [{ sku: "desc" }]);
});
