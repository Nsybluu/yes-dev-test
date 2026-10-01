import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { TopProductsList } from "@/components/admin/top-products-list";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getScanTotals, getTopProducts } from "@/lib/scans/stats";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-semibold">{value.toLocaleString("th-TH")}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  await requireAdmin();
  const [products, active, withoutImages, scans, top] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { images: { none: {} } } }),
    getScanTotals("all"),
    getTopProducts("all", 5),
  ]);

  return (
    <>
      <PageHeader title="แดชบอร์ด" description="ภาพรวมระบบ" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="สินค้าทั้งหมด" value={products} />
        <Stat label="เปิดใช้งาน" value={active} />
        <Stat label="ยังไม่มีรูป" value={withoutImages} />
        <Stat label="สแกนทั้งหมด" value={scans.total} />
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">สินค้าที่ถูกดูมากที่สุด</h2>
          <Button variant="ghost" size="sm" render={<Link href="/admin/scans" />}>
            ดูสถิติทั้งหมด
          </Button>
        </div>
        <TopProductsList products={top} showLastScan={false} />
      </section>
    </>
  );
}
