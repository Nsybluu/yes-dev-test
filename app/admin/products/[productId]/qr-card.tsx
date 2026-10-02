import { BaseUrlNotice } from "@/components/admin/base-url-notice";
import { productUrl } from "@/lib/qr";
import { QrCustomizer } from "@/app/admin/products/[productId]/qr-customizer";

export function QrCard({ productId, sku }: { productId: string; sku: string }) {
  return (
    <aside className="grid h-fit gap-3 rounded-lg border p-4">
      <h2 className="font-medium">QR Code</h2>
      <QrCustomizer productId={productId} sku={sku} />
      <div className="grid gap-1">
        <a
          href={productUrl(productId)}
          target="_blank"
          rel="noreferrer"
          className="text-xs break-all underline underline-offset-2"
        >
          {productUrl(productId)}
        </a>
        <p className="text-muted-foreground text-xs">
          ลิงก์ที่ฝังใน QR กดเปิดแล้วนับเป็นการเข้าดู เหมือนสแกน QR
        </p>
      </div>
      <p className="text-muted-foreground text-xs">
        QR ผูกกับสินค้านี้ตลอดไป แก้ไขข้อมูลสินค้าแล้ว QR เดิมยังใช้ได้ จะใช้ไม่ได้ก็ต่อเมื่อลบสินค้า
      </p>
      <BaseUrlNotice compact />
    </aside>
  );
}
