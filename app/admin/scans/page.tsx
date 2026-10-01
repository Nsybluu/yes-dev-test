import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { TopProductsList } from "@/components/admin/top-products-list";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { SCAN_RANGES, deviceFromUserAgent, parseRange } from "@/lib/scans/helpers";
import { getRecentScans, getScanTotals, getTopProducts } from "@/lib/scans/stats";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-semibold">{value.toLocaleString("th-TH")}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

export default async function ScansPage({ searchParams }: PageProps<"/admin/scans">) {
  await requireAdmin();
  const range = parseRange((await searchParams).range);

  const [totals, top, recent] = await Promise.all([
    getScanTotals(range),
    getTopProducts(range, 10),
    getRecentScans(range, 15),
  ]);

  return (
    <>
      <PageHeader
        title="สถิติการสแกน"
        description="บันทึกทุกครั้งที่มีคนเปิดหน้าสินค้าจาก QR (ไม่นับบอต และไม่นับปุ่ม “ดูหน้าสาธารณะ” ในหลังบ้าน)"
      />

      <div className="flex flex-wrap gap-1">
        {SCAN_RANGES.map((r) => (
          <Button
            key={r.value}
            size="sm"
            variant={range === r.value ? "secondary" : "ghost"}
            render={<Link href={r.value === "all" ? "/admin/scans" : `/admin/scans?range=${r.value}`} />}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="สแกนทั้งหมดในช่วงนี้" value={totals.total} />
        <Stat label="สแกนวันนี้" value={totals.today} />
        <Stat label="สินค้าที่ถูกสแกน" value={totals.productsScanned} />
      </div>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">สินค้าที่ถูกดูมากที่สุด 10 อันดับ</h2>
        <TopProductsList products={top} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">การสแกนล่าสุด</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เวลา</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>อุปกรณ์</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground h-16 text-center">
                    ยังไม่มีข้อมูล
                  </TableCell>
                </TableRow>
              )}
              {recent.map((scan) => (
                <TableRow key={scan.scanLogId}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(scan.scannedAt)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/products/${scan.product.productId}`} className="hover:underline">
                      {scan.product.sku} · {scan.product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{deviceFromUserAgent(scan.userAgent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
