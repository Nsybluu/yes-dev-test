import type { PrismaClient } from "@/app/generated/prisma/client";
import type { ClearCounts } from "@/lib/products/clear-phrase";
import { deleteMediaFiles } from "@/lib/storage";


export async function countClearable(db: PrismaClient): Promise<ClearCounts> {
  const [products, images, scans] = await db.$transaction([
    db.product.count(),
    db.productImage.count(),
    db.scanLog.count(),
  ]);
  return { products, images, scans };
}

// Images and scan logs go with their products through the foreign keys'
// ON DELETE CASCADE, and the image files on disk are removed afterwards.
// Admin accounts are never touched.
export async function deleteAllProducts(db: PrismaClient): Promise<ClearCounts> {
  const [images, scans, deleted] = await db.$transaction([
    db.productImage.findMany({ select: { imagePath: true } }),
    db.scanLog.count(),
    db.product.deleteMany(),
  ]);
  await deleteMediaFiles(images.map((i) => i.imagePath));
  return { products: deleted.count, images: images.length, scans };
}
