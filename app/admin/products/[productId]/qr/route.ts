import { getCurrentAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { productQrPng } from "@/lib/qr";

// GET /admin/products/<id>/qr           -> PNG shown inline (preview)
// GET /admin/products/<id>/qr?download=1 -> same PNG as a file download
export async function GET(request: Request, ctx: RouteContext<"/admin/products/[productId]/qr">) {
  // proxy.ts redirects browsers without a session; this is the real check
  if (!(await getCurrentAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { productId },
    select: { sku: true },
  });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  const png = await productQrPng(productId);
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-store",
  };
  if (new URL(request.url).searchParams.has("download")) {
    headers["Content-Disposition"] = `attachment; filename="QR-${product.sku}.png"`;
  }
  return new Response(new Uint8Array(png), { headers });
}
