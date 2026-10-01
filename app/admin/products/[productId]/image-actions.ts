"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/images/constants";
import { inspectImage } from "@/lib/images/validation";
import { prisma } from "@/lib/prisma";
import { deleteMediaFiles, mediaUrl, saveImageFile } from "@/lib/storage";
import type { Prisma } from "@/app/generated/prisma/client";

export type ImageResult = { ok: true; warning?: string | null } | { ok: false; error: string };

// Order is the only thing that says which image is the main one: the first
// (sortOrder 0) is the main image, the rest are the gallery. After every change
// the numbers are rewritten as 0..n-1 so that stays true.
async function renumber(tx: Prisma.TransactionClient, productId: string) {
  const rows = await tx.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { productImageId: true, sortOrder: true },
  });
  for (const [index, row] of rows.entries()) {
    if (row.sortOrder !== index) {
      await tx.productImage.update({
        where: { productImageId: row.productImageId },
        data: { sortOrder: index },
      });
    }
  }
}

function refresh(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath(`/p/${productId}`);
}

// role "main"   : becomes the main image; an existing main image is replaced
// role "gallery": added after the existing images
export async function uploadProductImage(
  productId: string,
  role: "main" | "gallery",
  formData: FormData,
): Promise<ImageResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "ไม่พบไฟล์ที่อัปโหลด" };

  const product = await prisma.product.findUnique({ where: { productId }, select: { productId: true } });
  if (!product) return { ok: false, error: "ไม่พบสินค้านี้ อาจถูกลบไปแล้ว" };

  const current = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    select: { productImageId: true, imagePath: true },
  });
  const replacing = role === "main" ? current[0] : undefined;

  if (role === "gallery" && current.length === 0) {
    return { ok: false, error: "กรุณาอัปโหลดรูปหลักก่อน แล้วจึงเพิ่มรูป Gallery" };
  }
  if (!replacing && current.length >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `สินค้านี้มีรูปครบ ${MAX_IMAGES_PER_PRODUCT} รูปแล้ว กรุณาลบรูปก่อนเพิ่มใหม่` };
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const check = inspectImage(data, file.name);
  if (!check.ok) return check;

  const name = await saveImageFile(data, check.ext);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.productImage.create({
        data: {
          productId,
          imageName: file.name.replace(/[\\/]/g, "").slice(0, 120) || name,
          imagePath: mediaUrl(name),
          sortOrder: role === "main" ? -1 : current.length, // -1 sorts before everything
        },
      });
      if (replacing) {
        await tx.productImage.delete({ where: { productImageId: replacing.productImageId } });
      }
      await renumber(tx, productId);
    });
  } catch (e) {
    await deleteMediaFiles([mediaUrl(name)]); // don't leave an orphan file behind
    throw e;
  }
  if (replacing) await deleteMediaFiles([replacing.imagePath]);

  refresh(productId);
  return { ok: true, warning: check.warning };
}

export async function setMainImage(productId: string, imageId: string): Promise<ImageResult> {
  await requireAdmin();
  const found = await prisma.productImage.findFirst({
    where: { productImageId: imageId, productId },
    select: { productImageId: true },
  });
  if (!found) return { ok: false, error: "ไม่พบรูปนี้ อาจถูกลบไปแล้ว" };

  await prisma.$transaction(async (tx) => {
    await tx.productImage.update({ where: { productImageId: imageId }, data: { sortOrder: -1 } });
    await renumber(tx, productId);
  });
  refresh(productId);
  return { ok: true };
}

export async function deleteProductImage(productId: string, imageId: string): Promise<ImageResult> {
  await requireAdmin();
  const image = await prisma.productImage.findFirst({
    where: { productImageId: imageId, productId },
    select: { imagePath: true },
  });
  if (!image) return { ok: false, error: "ไม่พบรูปนี้ อาจถูกลบไปแล้ว" };

  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { productImageId: imageId } });
    await renumber(tx, productId);
  });
  await deleteMediaFiles([image.imagePath]);
  refresh(productId);
  return { ok: true };
}
