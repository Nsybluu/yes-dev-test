import { PackageSearch } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <PackageSearch className="text-muted-foreground size-12 stroke-1" />
      <h1 className="text-xl font-semibold">ไม่พบสินค้า</h1>
      <p className="text-muted-foreground text-base leading-7 text-balance">
        สินค้านี้อาจถูกนำออกหรือยังไม่เปิดให้ดูข้อมูลในขณะนี้
      </p>
    </main>
  );
}
