"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { analyzeUpload, type AnalyzeOutcome } from "@/lib/products/import-service";
import type { Prisma } from "@/app/generated/prisma/client";

export type Decision = "overwrite" | "skip";

export type CommitOutcome =
  | {
      ok: true;
      created: number;
      updated: number;
      /** existing SKUs the admin chose not to overwrite */
      skipped: number;
      unchanged: number;
      /** rows left out because they had problems */
      errorRows: number;
    }
  | { ok: false; error: string };

// Step 1: read and check the file. Nothing is written.
export async function previewImport(formData: FormData): Promise<AnalyzeOutcome> {
  await requireAdmin();
  return analyzeUpload(formData.get("file"));
}

// Step 2: the browser sends the same file again plus the admin's decisions for
// duplicate SKUs. The file is re-checked here so we never trust a stale preview
// (another admin may have added the same SKU in the meantime).
export async function commitImport(formData: FormData): Promise<CommitOutcome> {
  await requireAdmin();

  const analysis = await analyzeUpload(formData.get("file"));
  if (!analysis.ok) return analysis;

  let decisions: Record<string, Decision> = {};
  try {
    const parsed = JSON.parse(String(formData.get("decisions") ?? "{}"));
    if (parsed && typeof parsed === "object") decisions = parsed;
  } catch {
    return { ok: false, error: "ข้อมูลการเลือกไม่ถูกต้อง กรุณาลองใหม่" };
  }

  const operations = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of analysis.rows) {
    if (!row.data) continue;

    if (row.status === "new") {
      operations.push(
        prisma.product.create({ data: { ...row.data, status: row.data.status ?? "ACTIVE" } }),
      );
      created++;
    } else if (row.status === "update") {
      if (decisions[row.data.sku] !== "overwrite") {
        skipped++;
        continue;
      }
      // write only the fields that actually differ; empty cells never erase saved data
      const data: Prisma.ProductUpdateInput = Object.fromEntries(
        row.changes.map((c) => [c.field, row.data![c.field]]),
      );
      operations.push(prisma.product.update({ where: { sku: row.data.sku }, data }));
      updated++;
    }
  }

  try {
    await prisma.$transaction(operations);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return {
        ok: false,
        error: "มีผู้ใช้อื่นเพิ่ม SKU เดียวกันระหว่างที่คุณตรวจสอบไฟล์ ยังไม่มีข้อมูลถูกนำเข้า กรุณาตรวจสอบไฟล์ใหม่อีกครั้ง",
      };
    }
    throw e;
  }

  revalidatePath("/admin/products");
  return {
    ok: true,
    created,
    updated,
    skipped,
    unchanged: analysis.summary.unchanged,
    errorRows: analysis.summary.error,
  };
}
