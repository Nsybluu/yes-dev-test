import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { TopProduct } from "@/lib/scans/stats";

// Ranked list of the most scanned products, with a bar scaled to the leader
export function TopProductsList({ products, showLastScan = true }: { products: TopProduct[]; showLastScan?: boolean }) {
  if (products.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        ยังไม่มีการสแกน ลองเปิดลิงก์ของ QR (ลิงก์ที่แสดงใต้รูป QR ในหน้าแก้ไขสินค้า) ในเบราว์เซอร์หรือสแกนด้วยมือถือ
      </p>
    );
  }
  const max = Math.max(...products.map((p) => p.scans));

  return (
    <ol className="grid gap-2">
      {products.map((p, index) => (
        <li key={p.productId} className="flex items-center gap-3 rounded-lg border p-3">
          <span className="text-muted-foreground w-6 text-center text-sm font-medium">{index + 1}</span>
          <div className="bg-muted text-muted-foreground relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
            {p.image ? (
              <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/admin/products/${p.productId}`} className="truncate font-medium hover:underline">
                {p.sku} · {p.name}
              </Link>
              {p.status === "INACTIVE" && <Badge variant="outline">ปิดใช้งาน</Badge>}
            </div>
            <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${(p.scans / max) * 100}%` }} />
            </div>
            {showLastScan && p.lastScannedAt && (
              <p className="text-muted-foreground mt-1 text-xs">สแกนล่าสุด {formatDateTime(p.lastScannedAt)}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg leading-none font-semibold">{p.scans.toLocaleString("th-TH")}</div>
            <div className="text-muted-foreground text-xs">ครั้ง</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
