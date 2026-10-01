// One set of rules shared by the product form and the Excel import, so a
// product is valid or invalid for the same reasons in both places.
// Pure functions only (no DB, no framework) so they are easy to test.

export const CATEGORIES = [
  "Cleanser",
  "Toner",
  "Serum",
  "Moisturizer",
  "Sunscreen",
  "Mask",
] as const;

export const SKU_PATTERN = /^LS-\d{4}$/;

export const LIMITS = {
  name: 200,
  size: 50,
  text: 5000,
  priceMax: 99_999_999.99,
} as const;

export type FieldKey =
  | "sku"
  | "name"
  | "category"
  | "price"
  | "size"
  | "description"
  | "howToUse"
  | "status";

export const FIELD_LABELS: Record<FieldKey, string> = {
  sku: "sku",
  name: "name",
  category: "category",
  price: "price",
  size: "size",
  description: "description",
  howToUse: "how_to_use",
  status: "status",
};

// missing   = required value is empty
// type      = value is the wrong kind of data (e.g. text in price)
// format    = right kind, not an allowed value/shape (e.g. status "yes")
// range     = number/length outside what's allowed (e.g. price 0)
// duplicate = same SKU twice in the file
export type IssueKind = "missing" | "type" | "format" | "range" | "duplicate";

export type Issue = {
  field: FieldKey;
  kind: IssueKind;
  message: string;
  /** what was actually in the cell, to help find it in Excel */
  value?: string;
};

// case  = letter case was normalised (ls-0012 -> LS-0012)
// clean = stray symbols were removed (฿1,290 -> 1290)
export type FixKind = "case" | "clean";

export type Fix = { field: FieldKey; kind: FixKind; from: string; to: string };

export type RawProduct = Partial<Record<FieldKey, string | null | undefined>>;

export type ProductFields = {
  sku: string;
  name: string;
  category: string | null;
  /** fixed 2-decimal string, safe to hand to Prisma Decimal */
  price: string;
  size: string | null;
  description: string | null;
  howToUse: string | null;
  /** null = not provided (import: default ACTIVE for new, keep for existing) */
  status: "ACTIVE" | "INACTIVE" | null;
};

export type ValidationResult = {
  data: ProductFields | null;
  issues: Issue[];
  fixes: Fix[];
};

const clean = (v: string | null | undefined) => (v ?? "").trim();

export function validateProduct(raw: RawProduct): ValidationResult {
  const issues: Issue[] = [];
  const fixes: Fix[] = [];

  // --- sku
  let sku = clean(raw.sku);
  if (!sku) {
    issues.push({ field: "sku", kind: "missing", message: "ไม่มี SKU" });
  } else {
    const upper = sku.toUpperCase();
    if (upper !== sku) fixes.push({ field: "sku", kind: "case", from: sku, to: upper });
    if (!SKU_PATTERN.test(upper)) {
      issues.push({
        field: "sku",
        kind: "format",
        message: "รูปแบบ SKU ต้องเป็น LS-0000 (ตัวเลข 4 หลัก)",
        value: sku,
      });
    } else {
      sku = upper;
    }
  }

  // --- name
  const name = clean(raw.name);
  if (!name) {
    issues.push({ field: "name", kind: "missing", message: "ไม่มีชื่อสินค้า" });
  } else if (name.length > LIMITS.name) {
    issues.push({
      field: "name",
      kind: "range",
      message: `ชื่อสินค้ายาวเกิน ${LIMITS.name} ตัวอักษร`,
      value: name.slice(0, 40) + "…",
    });
  }

  // --- price
  let price = "";
  const priceRaw = clean(raw.price);
  if (!priceRaw) {
    issues.push({ field: "price", kind: "missing", message: "ไม่มีราคา" });
  } else {
    // strip currency symbols, "บาท", commas and spaces: "฿1,290 บาท" -> "1290"
    const stripped = priceRaw.replace(/฿|บาท|,|\s/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(stripped)) {
      issues.push({
        field: "price",
        kind: "type",
        message: "ราคาต้องเป็นตัวเลข",
        value: priceRaw,
      });
    } else {
      const num = Number(stripped);
      const decimals = stripped.split(".")[1]?.length ?? 0;
      if (num <= 0) {
        issues.push({
          field: "price",
          kind: "range",
          message: "ราคาต้องมากกว่า 0",
          value: priceRaw,
        });
      } else if (decimals > 2) {
        issues.push({
          field: "price",
          kind: "range",
          message: "ราคาทศนิยมได้ไม่เกิน 2 ตำแหน่ง",
          value: priceRaw,
        });
      } else if (num > LIMITS.priceMax) {
        issues.push({
          field: "price",
          kind: "range",
          message: "ราคาสูงเกินกว่าที่ระบบรองรับ",
          value: priceRaw,
        });
      } else {
        price = num.toFixed(2);
        if (stripped !== priceRaw) {
          fixes.push({ field: "price", kind: "clean", from: priceRaw, to: stripped });
        }
      }
    }
  }

  // --- category (optional, fixed list, case-insensitive)
  let category: string | null = null;
  const categoryRaw = clean(raw.category);
  if (categoryRaw) {
    const match = CATEGORIES.find((c) => c.toLowerCase() === categoryRaw.toLowerCase());
    if (!match) {
      issues.push({
        field: "category",
        kind: "format",
        message: `หมวดหมู่ต้องเป็น ${CATEGORIES.join(", ")}`,
        value: categoryRaw,
      });
    } else {
      category = match;
      if (match !== categoryRaw) {
        fixes.push({ field: "category", kind: "case", from: categoryRaw, to: match });
      }
    }
  }

  // --- optional free text
  const size = clean(raw.size) || null;
  if (size && size.length > LIMITS.size) {
    issues.push({
      field: "size",
      kind: "range",
      message: `ขนาดยาวเกิน ${LIMITS.size} ตัวอักษร`,
      value: size.slice(0, 40) + "…",
    });
  }
  const description = clean(raw.description) || null;
  if (description && description.length > LIMITS.text) {
    issues.push({
      field: "description",
      kind: "range",
      message: `รายละเอียดยาวเกิน ${LIMITS.text} ตัวอักษร`,
    });
  }
  const howToUse = clean(raw.howToUse) || null;
  if (howToUse && howToUse.length > LIMITS.text) {
    issues.push({
      field: "howToUse",
      kind: "range",
      message: `วิธีใช้ยาวเกิน ${LIMITS.text} ตัวอักษร`,
    });
  }

  // --- status (optional: active / inactive)
  let status: ProductFields["status"] = null;
  const statusRaw = clean(raw.status);
  if (statusRaw) {
    const lower = statusRaw.toLowerCase();
    if (lower === "active" || lower === "inactive") {
      status = lower === "active" ? "ACTIVE" : "INACTIVE";
      if (lower !== statusRaw) {
        fixes.push({ field: "status", kind: "case", from: statusRaw, to: lower });
      }
    } else {
      issues.push({
        field: "status",
        kind: "format",
        message: "status ต้องเป็น active หรือ inactive",
        value: statusRaw,
      });
    }
  }

  if (issues.length > 0) return { data: null, issues, fixes };
  return {
    data: { sku, name, category, price, size, description, howToUse, status },
    issues,
    fixes,
  };
}
