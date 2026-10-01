import { Store } from "lucide-react";

// Shared frame for every public product page (including its not-found page)
export default function PublicLayout({ children }: LayoutProps<"/p">) {
  return (
    <div className="bg-public-bg flex min-h-svh flex-1 flex-col">
      <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
          <span className="bg-brand text-background flex size-7 items-center justify-center rounded-lg">
            <Store className="size-4" />
          </span>
          <span className="font-medium">ข้อมูลสินค้า</span>
        </div>
      </header>
      {children}
    </div>
  );
}
