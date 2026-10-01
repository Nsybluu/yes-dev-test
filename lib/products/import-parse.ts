import ExcelJS from "exceljs";
import type { FieldKey, RawProduct } from "@/lib/products/validation";

export const MAX_ROWS = 1000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const REQUIRED_COLUMNS: FieldKey[] = ["sku", "name", "price"];

export type RawRow = { rowNumber: number; values: RawProduct };

export type ParseResult =
  | {
      ok: true;
      rows: RawRow[];
      /** rows that exist in the sheet but have no data in any known column */
      blankRows: number;
      /** column headers we don't use, shown so the admin knows they were ignored */
      unknownColumns: string[];
    }
  | { ok: false; error: string; missingColumns?: string[] };

// "how_to_use", "How to use", "how-to-use" and "HowToUse" all map to howToUse
const HEADER_MAP: Record<string, FieldKey> = {
  sku: "sku",
  name: "name",
  category: "category",
  price: "price",
  size: "size",
  description: "description",
  howtouse: "howToUse",
  status: "status",
};

function normalizeHeader(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ExcelJS hands back different shapes depending on the cell type
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ("richText" in value) return value.richText.map((r) => r.text).join("");
  if ("result" in value) return cellToString(value.result as ExcelJS.CellValue); // formula
  if ("text" in value) return String(value.text); // hyperlink
  if ("error" in value) return String(value.error);
  return "";
}

export async function parseProductWorkbook(buffer: Buffer | ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as ArrayBuffer);
  } catch {
    return { ok: false, error: "อ่านไฟล์ไม่ได้ กรุณาใช้ไฟล์ Excel (.xlsx) ที่ไม่เสียหาย" };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { ok: false, error: "ไม่พบแผ่นงาน (sheet) ในไฟล์" };

  // header row = first row
  const columns = new Map<number, FieldKey>();
  const unknownColumns: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellToString(cell.value).trim();
    if (!text) return;
    const field = HEADER_MAP[normalizeHeader(text)];
    // if a header appears twice, the first column wins
    if (field && ![...columns.values()].includes(field)) columns.set(colNumber, field);
    else unknownColumns.push(text);
  });

  const found = new Set(columns.values());
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !found.has(c));
  if (missingColumns.length > 0) {
    return {
      ok: false,
      error: `ไฟล์ไม่มีคอลัมน์ที่จำเป็น: ${missingColumns.join(", ")} (ต้องมีหัวคอลัมน์ในแถวแรก)`,
      missingColumns,
    };
  }

  const rows: RawRow[] = [];
  let blankRows = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: RawProduct = {};
    let hasData = false;
    for (const [colNumber, field] of columns) {
      const text = cellToString(row.getCell(colNumber).value).trim();
      values[field] = text;
      if (text) hasData = true;
    }
    if (hasData) rows.push({ rowNumber, values });
    else blankRows++;
  });

  if (rows.length === 0) return { ok: false, error: "ไม่พบข้อมูลสินค้าในไฟล์ (มีแต่หัวคอลัมน์หรือแถวว่าง)" };
  if (rows.length > MAX_ROWS) {
    return { ok: false, error: `ไฟล์มีข้อมูล ${rows.length.toLocaleString("th-TH")} แถว เกินที่รองรับ (${MAX_ROWS.toLocaleString("th-TH")} แถวต่อครั้ง) กรุณาแบ่งไฟล์` };
  }

  return { ok: true, rows, blankRows, unknownColumns };
}
