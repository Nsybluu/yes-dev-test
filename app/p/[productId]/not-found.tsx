import { PackageSearch } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="bg-brand-soft text-brand flex size-20 items-center justify-center rounded-full">
        <PackageSearch className="size-9 stroke-[1.5]" />
      </span>
      <h1 className="text-2xl font-semibold">ไม่พบสินค้า</h1>
      <p className="text-muted-foreground text-base leading-7 text-balance">
        สินค้านี้อาจถูกนำออกหรือยังไม่เปิดให้ดูข้อมูลในขณะนี้
      </p>
    </main>
  );
}
