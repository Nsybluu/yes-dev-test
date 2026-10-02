import { getCurrentAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { productQrPng } from "@/lib/qr";
import { parseQrOptions } from "@/lib/qr-style/options";

// GET /admin/products/<id>/qr                          -> PNG shown inline (preview)
// GET /admin/products/<id>/qr?download=1               -> the same PNG as a file download
// optional: &size=<px> (200-4000, default 1024) and &bg=<hex colour, default ffffff>
export async function GET(request: Request, ctx: RouteContext<"/admin/products/[productId]/qr">) {
  // proxy.ts redirects browsers without a session; this is the real check
  if (!(await getCurrentAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  // validated here too, not only in the page: the URL can be edited by hand
  const parsed = parseQrOptions(url.searchParams);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const { productId } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { productId },
    select: { sku: true },
  });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  const png = await productQrPng(productId, parsed.options);
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-store",
  };
  if (url.searchParams.has("download")) {
    const { size } = parsed.options;
    headers["Content-Disposition"] = `attachment; filename="QR-${product.sku}-${size}px.png"`;
  }
  return new Response(new Uint8Array(png), { headers });
}
