import type { PrismaClient } from "@/app/generated/prisma/client";

// The phrase an admin must type before "clear all products" is allowed
export const CLEAR_PHRASE = "ลบสินค้าทั้งหมด";

export type ClearCounts = { products: number; images: number; scans: number };

export async function countClearable(db: PrismaClient): Promise<ClearCounts> {
  const [products, images, scans] = await db.$transaction([
    db.product.count(),
    db.productImage.count(),
    db.scanLog.count(),
  ]);
  return { products, images, scans };
}

// Images and scan logs go with their products through the foreign keys'
// ON DELETE CASCADE. Admin accounts are never touched.
// NOTE: once image upload exists, the image files on disk must be removed here too.
export async function deleteAllProducts(db: PrismaClient): Promise<ClearCounts> {
  const [images, scans, deleted] = await db.$transaction([
    db.productImage.count(),
    db.scanLog.count(),
    db.product.deleteMany(),
  ]);
  return { products: deleted.count, images, scans };
}
