// Turns parsed Excel rows into a per-row verdict. Pure (no DB access): the
// caller passes in the products that already exist, which keeps this testable.

import type { RawRow } from "@/lib/products/import-parse";
import {
  SKU_PATTERN,
  validateProduct,
  type FieldKey,
  type Fix,
  type FixKind,
  type Issue,
  type IssueKind,
  type ProductFields,
} from "@/lib/products/validation";

// new       = SKU not in the DB yet
// update    = SKU exists and at least one provided value differs (needs a decision)
// unchanged = SKU exists and nothing would change
// error     = row can't be imported
export type RowStatus = "new" | "update" | "unchanged" | "error";

export type FieldChange = { field: FieldKey; before: string | null; after: string | null };

export type AnalyzedRow = {
  rowNumber: number;
  /** SKU as typed (or normalised once valid), for display */
  sku: string;
  name: string;
  status: RowStatus;
  data: ProductFields | null;
  issues: Issue[];
  fixes: Fix[];
  changes: FieldChange[];
};

export type ExistingProduct = {
  sku: string;
  name: string;
  category: string | null;
  /** decimal string from the DB, e.g. "390.00" */
  price: string;
  size: string | null;
  description: string | null;
  howToUse: string | null;
  status: "ACTIVE" | "INACTIVE";
};

export type ImportSummary = {
  totalRows: number;
  blankRows: number;
  new: number;
  update: number;
  unchanged: number;
  error: number;
  rowsWithFixes: number;
  issueCounts: Record<IssueKind, number>;
  fixCounts: Record<FixKind, number>;
};

/** Normalised SKU if it looks like one, else null (used to spot duplicates) */
export function normalizeSku(raw: string | null | undefined) {
  const upper = (raw ?? "").trim().toUpperCase();
  return SKU_PATTERN.test(upper) ? upper : null;
}

const statusText = (s: "ACTIVE" | "INACTIVE" | null) => (s ? s.toLowerCase() : null);

function diff(data: ProductFields, existing: ExistingProduct): FieldChange[] {
  const changes: FieldChange[] = [];

  if (data.name !== existing.name) {
    changes.push({ field: "name", before: existing.name, after: data.name });
  }
  if (Number(data.price) !== Number(existing.price)) {
    changes.push({ field: "price", before: existing.price, after: data.price });
  }
  // An empty cell never erases what's already saved, so only provided values count
  const optional = ["category", "size", "description", "howToUse"] as const;
  for (const field of optional) {
    const after = data[field];
    if (after !== null && after !== existing[field]) {
      changes.push({ field, before: existing[field], after });
    }
  }
  if (data.status !== null && data.status !== existing.status) {
    changes.push({ field: "status", before: statusText(existing.status), after: statusText(data.status) });
  }
  return changes;
}

export function analyzeRows(rows: RawRow[], existing: Map<string, ExistingProduct>): AnalyzedRow[] {
  // which rows share each (valid-looking) SKU
  const rowsBySku = new Map<string, number[]>();
  for (const row of rows) {
    const sku = normalizeSku(row.values.sku);
    if (sku) rowsBySku.set(sku, [...(rowsBySku.get(sku) ?? []), row.rowNumber]);
  }

  return rows.map((row): AnalyzedRow => {
    const { data, issues, fixes } = validateProduct(row.values);
    const normalized = normalizeSku(row.values.sku);

    if (normalized) {
      const others = (rowsBySku.get(normalized) ?? []).filter((n) => n !== row.rowNumber);
      if (others.length > 0) {
        issues.push({
          field: "sku",
          kind: "duplicate",
          message: `SKU ซ้ำกับแถว ${others.join(", ")} ในไฟล์เดียวกัน`,
          value: row.values.sku?.trim(),
        });
      }
    }

    const base = {
      rowNumber: row.rowNumber,
      sku: normalized ?? (row.values.sku ?? "").trim(),
      name: (row.values.name ?? "").trim(),
      fixes,
    };

    if (issues.length > 0 || !data) {
      return { ...base, status: "error", data: null, issues, changes: [] };
    }

    const found = existing.get(data.sku);
    if (!found) return { ...base, status: "new", data, issues, changes: [] };

    const changes = diff(data, found);
    return { ...base, status: changes.length > 0 ? "update" : "unchanged", data, issues, changes };
  });
}

export function summarize(rows: AnalyzedRow[], blankRows: number): ImportSummary {
  const summary: ImportSummary = {
    totalRows: rows.length,
    blankRows,
    new: 0,
    update: 0,
    unchanged: 0,
    error: 0,
    rowsWithFixes: 0,
    issueCounts: { missing: 0, type: 0, format: 0, range: 0, duplicate: 0 },
    fixCounts: { case: 0, clean: 0 },
  };
  for (const row of rows) {
    summary[row.status]++;
    if (row.fixes.length > 0) summary.rowsWithFixes++;
    for (const issue of row.issues) summary.issueCounts[issue.kind]++;
    for (const fix of row.fixes) summary.fixCounts[fix.kind]++;
  }
  return summary;
}
