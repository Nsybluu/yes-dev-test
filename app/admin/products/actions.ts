"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin, requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CLEAR_PHRASE, deleteAllProducts } from "@/lib/products/clear";
import {
  validateProduct,
  type FieldKey,
  type ProductFields,
  type RawProduct,
} from "@/lib/products/validation";

export type ProductFormState =
  | { errors?: Partial<Record<FieldKey, string>>; values?: Record<string, string>; message?: string }
  | undefined;

const FIELDS: FieldKey[] = [
  "sku",
  "name",
  "category",
  "price",
  "size",
  "description",
  "howToUse",
  "status",
];

function readForm(formData: FormData) {
  const values: Record<string, string> = {};
  for (const f of FIELDS) values[f] = String(formData.get(f) ?? "");
  // the select uses "none" as its empty option
  if (values.category === "none") values.category = "";
  return values;
}

function check(values: Record<string, string>) {
  const { data, issues } = validateProduct(values as RawProduct);
  if (data) return { data };
  const errors: Partial<Record<FieldKey, string>> = {};
  for (const issue of issues) errors[issue.field] ??= issue.message;
  return { errors };
}

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

function toDb(data: ProductFields) {
  return { ...data, status: data.status ?? ("ACTIVE" as const) };
}

export async function createProduct(
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const values = readForm(formData);
  const result = check(values);
  if (!result.data) return { errors: result.errors, values };

  const dup = { errors: { sku: "SKU นี้มีอยู่แล้ว" }, values };
  if (await prisma.product.findUnique({ where: { sku: result.data.sku } })) return dup;

  try {
    await prisma.product.create({ data: toDb(result.data) });
  } catch (e) {
    if (isUniqueViolation(e)) return dup;
    throw e;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?saved=created");
}

export async function updateProduct(
  productId: string,
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const values = readForm(formData);
  const result = check(values);
  if (!result.data) return { errors: result.errors, values };

  const dup = { errors: { sku: "SKU นี้ถูกใช้โดยสินค้าอื่นแล้ว" }, values };
  const clash = await prisma.product.findUnique({ where: { sku: result.data.sku } });
  if (clash && clash.productId !== productId) return dup;

  try {
    // productId is deliberately untouched so printed QR codes keep working
    await prisma.product.update({ where: { productId }, data: toDb(result.data) });
  } catch (e) {
    if (isUniqueViolation(e)) return dup;
    if ((e as { code?: string }).code === "P2025") {
      return { message: "ไม่พบสินค้านี้ อาจถูกลบไปแล้ว", values };
    }
    throw e;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?saved=updated");
}

export type ClearResult =
  | { ok: true; deleted: number }
  | { ok: false; error: string };

// Wipes every product. Every safeguard is enforced here, not just in the dialog:
// Super Admin only, the exact confirmation phrase, and the admin's own password.
export async function clearAllProducts(phrase: string, password: string): Promise<ClearResult> {
  const admin = await getCurrentAdmin();
  if (!admin || admin.adminRole !== "SUPER_ADMIN") {
    return { ok: false, error: "เฉพาะ Super Admin เท่านั้นที่ล้างสินค้าทั้งหมดได้" };
  }
  if (phrase.trim() !== CLEAR_PHRASE) {
    return { ok: false, error: "ข้อความยืนยันไม่ตรง" };
  }

  const account = await prisma.admin.findUnique({
    where: { adminId: admin.adminId },
    select: { passwordHash: true },
  });
  const valid = !!account?.passwordHash && (await bcrypt.compare(password, account.passwordHash));
  if (!valid) return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };

  const result = await deleteAllProducts(prisma);
  revalidatePath("/admin/products");
  return { ok: true, deleted: result.products };
}

export async function deleteProduct(productId: string) {
  await requireAdmin();
  // deleteMany: no error if it was already deleted by someone else
  await prisma.product.deleteMany({ where: { productId } });
  revalidatePath("/admin/products");
}
