import { prisma } from "@/lib/prisma";
import {
  analyzeRows,
  normalizeSku,
  summarize,
  type AnalyzedRow,
  type ExistingProduct,
  type ImportSummary,
} from "@/lib/products/import-analyze";
import { MAX_FILE_BYTES, parseProductWorkbook } from "@/lib/products/import-parse";

export type AnalyzeOutcome =
  | { ok: true; rows: AnalyzedRow[]; summary: ImportSummary; unknownColumns: string[] }
  | { ok: false; error: string };

export async function analyzeUpload(file: unknown): Promise<AnalyzeOutcome> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "กรุณาเลือกไฟล์ Excel" };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "รองรับเฉพาะไฟล์ Excel นามสกุล .xlsx" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_FILE_BYTES / 1024 / 1024} MB)` };
  }

  const parsed = await parseProductWorkbook(await file.arrayBuffer());
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const skus = [
    ...new Set(parsed.rows.map((r) => normalizeSku(r.values.sku)).filter((s): s is string => !!s)),
  ];
  const found = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: {
      sku: true,
      name: true,
      category: true,
      price: true,
      size: true,
      description: true,
      howToUse: true,
      status: true,
    },
  });
  const existing = new Map<string, ExistingProduct>(
    found.map((p) => [p.sku, { ...p, price: p.price.toString() }]),
  );

  const rows = analyzeRows(parsed.rows, existing);
  return {
    ok: true,
    rows,
    summary: summarize(rows, parsed.blankRows),
    unknownColumns: parsed.unknownColumns,
  };
}
