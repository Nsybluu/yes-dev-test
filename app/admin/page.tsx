import Link from "next/link";
import { BarChart, DonutChart, type DonutSegment } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { DeviceType } from "@/lib/scans/devices";
import { getDeviceBreakdown, getScanTotals, getTopProducts } from "@/lib/scans/stats";

// colours chosen to stay apart from each other and to read on light and dark backgrounds
const DEVICE_COLORS: Record<DeviceType, string> = {
  mobile: "oklch(0.62 0.15 250)",
  tablet: "oklch(0.74 0.14 75)",
  desktop: "oklch(0.62 0.11 175)",
  unknown: "oklch(0.72 0 0)",
};
const SYSTEM_COLOR = "oklch(0.62 0.15 250)";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-semibold">{value.toLocaleString("th-TH")}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
      ยังไม่มีข้อมูลการสแกน ลองเปิดลิงก์ของ QR (ลิงก์ใต้รูป QR ในหน้าแก้ไขสินค้า) หรือสแกนด้วยมือถือ
    </p>
  );
}

export default async function DashboardPage() {
  await requireAdmin();

  const [products, active, withoutImages, scans, top, devices] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { images: { none: {} } } }),
    getScanTotals("all"),
    getTopProducts("all", 8),
    getDeviceBreakdown("all"),
  ]);

  const topProduct = top[0];
  const topDevice = devices.types[0];
  const topSystem = devices.systems.find((s) => s.key !== "unknown" && s.key !== "other") ?? devices.systems[0];

  return (
    <>
      <PageHeader title="แดชบอร์ด" description="ภาพรวมระบบและสถิติการเข้าดูสินค้า" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="สินค้าทั้งหมด" value={products} />
        <Stat label="เปิดใช้งาน" value={active} />
        <Stat label="ยังไม่มีรูป" value={withoutImages} />
        <Stat label="การเข้าดูทั้งหมด" value={scans.total} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>สินค้าที่ถูกดูมากที่สุด</CardTitle>
            <CardDescription>
              {topProduct
                ? `อันดับ 1 คือ ${topProduct.sku} · ${topProduct.name} (${topProduct.scans.toLocaleString("th-TH")} ครั้ง)`
                : "จำนวนครั้งที่มีคนเปิดหน้าสินค้าหรือสแกน QR"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <Empty />
            ) : (
              <BarChart
                ariaLabel="สินค้าที่ถูกดูมากที่สุด"
                items={top.map((p) => ({
                  key: p.productId,
                  label: p.sku,
                  sublabel: p.name,
                  value: p.scans,
                  href: `/admin/products/${p.productId}`,
                }))}
              />
            )}
            <div className="mt-4 text-right">
              <Button variant="ghost" size="sm" render={<Link href="/admin/scans" />}>
                ดูสถิติทั้งหมด
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:col-span-2 xl:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>อุปกรณ์ที่ใช้เข้าดู</CardTitle>
              <CardDescription>
                {topDevice && topDevice.key !== "unknown"
                  ? `ส่วนใหญ่เข้าดูด้วย${topDevice.label} (${Math.round(topDevice.share * 100)}%)`
                  : "แยกตามชนิดอุปกรณ์"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices.total === 0 ? (
                <Empty />
              ) : (
                <DonutChart
                  ariaLabel="สัดส่วนชนิดอุปกรณ์ที่ใช้เข้าดูสินค้า"
                  total={devices.total}
                  centerLabel="ครั้ง"
                  segments={devices.types.map<DonutSegment>((t) => ({
                    key: t.key,
                    label: t.label,
                    value: t.count,
                    color: DEVICE_COLORS[t.key],
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ระบบปฏิบัติการ</CardTitle>
              <CardDescription>
                {topSystem && topSystem.key !== "unknown"
                  ? `พบมากที่สุดคือ ${topSystem.label} (${Math.round(topSystem.share * 100)}%)`
                  : "แยกตามระบบที่เครื่องใช้"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices.total === 0 ? (
                <Empty />
              ) : (
                <BarChart
                  ariaLabel="จำนวนการเข้าดูแยกตามระบบปฏิบัติการ"
                  color={SYSTEM_COLOR}
                  items={devices.systems.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
