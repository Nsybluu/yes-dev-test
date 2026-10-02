import { prisma } from "@/lib/prisma";
import { summarizeDevices, type DeviceSummary } from "@/lib/scans/devices";
import { MAX_USER_AGENT_LENGTH, rangeStart, type ScanRange } from "@/lib/scans/helpers";
import type { Prisma } from "@/app/generated/prisma/client";

export async function recordScan(productId: string, userAgent: string | null) {
  await prisma.scanLog.create({
    data: { productId, userAgent: userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null },
  });
}

function whereFor(range: ScanRange): Prisma.ScanLogWhereInput {
  const since = rangeStart(range);
  return since ? { scannedAt: { gte: since } } : {};
}

export type TopProduct = {
  productId: string;
  sku: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  image: string | null;
  scans: number;
  lastScannedAt: Date | null;
};

// Most scanned products first. Ties are broken by most recent scan, then by id,
// so the order doesn't jump around between page loads.
export async function getTopProducts(range: ScanRange, limit: number): Promise<TopProduct[]> {
  const groups = await prisma.scanLog.groupBy({
    by: ["productId"],
    where: whereFor(range),
    _count: { _all: true },
    _max: { scannedAt: true },
    orderBy: [{ _count: { productId: "desc" } }, { _max: { scannedAt: "desc" } }, { productId: "asc" }],
    take: limit,
  });
  if (groups.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { productId: { in: groups.map((g) => g.productId) } },
    select: {
      productId: true,
      sku: true,
      name: true,
      status: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { imagePath: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.productId, p]));

  return groups.flatMap((g) => {
    const p = byId.get(g.productId);
    return p
      ? [
          {
            productId: p.productId,
            sku: p.sku,
            name: p.name,
            status: p.status,
            image: p.images[0]?.imagePath ?? null,
            scans: g._count._all,
            lastScannedAt: g._max.scannedAt,
          },
        ]
      : [];
  });
}

export async function getScanTotals(range: ScanRange) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [total, today, productsScanned] = await Promise.all([
    prisma.scanLog.count({ where: whereFor(range) }),
    prisma.scanLog.count({ where: { scannedAt: { gte: startOfToday } } }),
    prisma.scanLog.groupBy({ by: ["productId"], where: whereFor(range) }).then((rows) => rows.length),
  ]);
  return { total, today, productsScanned };
}

export function getRecentScans(range: ScanRange, limit: number) {
  return prisma.scanLog.findMany({
    where: whereFor(range),
    orderBy: { scannedAt: "desc" },
    take: limit,
    select: {
      scanLogId: true,
      scannedAt: true,
      userAgent: true,
      product: { select: { productId: true, sku: true, name: true } },
    },
  });
}

// For the public page: popular ACTIVE products only (never leak hidden ones),
// without exposing the counts.
export async function getPopularActiveProducts(excludeProductId: string, limit: number) {
  const groups = await prisma.scanLog.groupBy({
    by: ["productId"],
    where: { productId: { not: excludeProductId } },
    _count: { _all: true },
    orderBy: [{ _count: { productId: "desc" } }, { productId: "asc" }],
    take: limit * 3, // some may be inactive; fetch extra, then filter
  });
  if (groups.length === 0) return [];
  const active = await prisma.product.findMany({
    where: { productId: { in: groups.map((g) => g.productId) }, status: "ACTIVE" },
    select: {
      productId: true,
      name: true,
      category: true,
      price: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { imagePath: true } },
    },
  });
  const byId = new Map(active.map((p) => [p.productId, p]));
  return groups.flatMap((g) => byId.get(g.productId) ?? []).slice(0, limit);
}

// Scans per device kind and operating system. The database only counts scans per distinct
// User-Agent string; the strings are classified here (lib/scans/devices.ts).
export async function getDeviceBreakdown(range: ScanRange): Promise<DeviceSummary> {
  const groups = await prisma.scanLog.groupBy({
    by: ["userAgent"],
    where: whereFor(range),
    _count: { _all: true },
  });
  return summarizeDevices(groups.map((g) => ({ userAgent: g.userAgent, count: g._count._all })));
}
