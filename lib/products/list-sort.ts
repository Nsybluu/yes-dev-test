import type { Prisma } from "@/app/generated/prisma/client";

// Columns of the product list that can be sorted by clicking their header
export const SORT_COLUMNS = { sku: "sku", name: "name", price: "price" } as const;
export type SortColumn = keyof typeof SORT_COLUMNS;
export type SortDir = "asc" | "desc";
export type ListSort = { column: SortColumn; dir: SortDir } | null; // null = newest first

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseSort(sort: string | string[] | undefined, dir: string | string[] | undefined): ListSort {
  const column = one(sort);
  // hasOwn, not `in`: "constructor" and "toString" are "in" every object
  if (!column || !Object.hasOwn(SORT_COLUMNS, column)) return null;
  return { column: column as SortColumn, dir: one(dir) === "desc" ? "desc" : "asc" };
}

// Clicking a header: a new column starts ascending, the active column flips direction
export function nextSort(current: ListSort, column: SortColumn): NonNullable<ListSort> {
  if (current?.column === column) return { column, dir: current.dir === "asc" ? "desc" : "asc" };
  return { column, dir: "asc" };
}

// productId is the last tie-breaker so rows never jump between pages (SKU is unique, so it needs none)
export function orderByFor(sort: ListSort): Prisma.ProductOrderByWithRelationInput[] {
  if (!sort) return [{ createdAt: "desc" }, { productId: "asc" }];
  const primary = { [SORT_COLUMNS[sort.column]]: sort.dir } as Prisma.ProductOrderByWithRelationInput;
  return sort.column === "sku" ? [primary] : [primary, { productId: "asc" }];
}
