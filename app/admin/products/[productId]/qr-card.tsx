import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBaseUrl, isLocalBaseUrl, productUrl } from "@/lib/qr";

export function QrCard({ productId, sku }: { productId: string; sku: string }) {
  const src = `/admin/products/${productId}/qr`;
  return (
    <aside className="grid h-fit gap-3 rounded-lg border p-4">
      <h2 className="font-medium">QR Code</h2>
      <div className="rounded-md border bg-white p-1">
        {/* the route already returns a finished PNG, so skip Next's image optimizer */}
        <Image src={src} alt={`QR Code ของ ${sku}`} width={224} height={224} unoptimized loading="eager" className="size-full" />
      </div>
      <p className="text-muted-foreground text-xs break-all">{productUrl(productId)}</p>
      <Button render={<a href={`${src}?download=1`} download />}>
        <Download />
        ดาวน์โหลด QR (PNG)
      </Button>
      <p className="text-muted-foreground text-xs">
        QR ผูกกับสินค้านี้ตลอดไป แก้ไขข้อมูลสินค้าแล้ว QR เดิมยังใช้ได้ จะใช้ไม่ได้ก็ต่อเมื่อลบสินค้า
      </p>
      {isLocalBaseUrl() && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          QR นี้ชี้ไปที่ <code>{getBaseUrl()}</code> ใช้ได้เฉพาะเครื่องนี้ ห้ามพิมพ์ ตั้งค่า{" "}
          <code>APP_URL</code> เป็นโดเมนจริงก่อน
        </p>
      )}
    </aside>
  );
}
