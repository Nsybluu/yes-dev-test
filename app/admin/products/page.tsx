import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, ImageIcon, Pencil, Plus, QrCode, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/dal";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getBaseUrl, isLocalBaseUrl } from "@/lib/qr";
import { DeleteProductButton } from "@/app/admin/products/delete-product-button";
import { ClearAllProducts } from "@/app/admin/products/clear-all-products";
import { countClearable } from "@/lib/products/clear";
import { nextSort, orderByFor, parseSort, type ListSort, type SortColumn } from "@/lib/products/list-sort";
import { SavedToast } from "@/app/admin/products/saved-toast";
import type { Prisma } from "@/app/generated/prisma/client";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "", label: "ทั้งหมด" },
  { value: "active", label: "เปิดใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
] as const;

function href(params: { q?: string; status?: string; page?: number; sort?: ListSort }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.sort) {
    sp.set("sort", params.sort.column);
    sp.set("dir", params.sort.dir);
  }
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

// A column header that sorts the list when clicked (and flips the direction on the next click).
// Sorting happens in the database, so it applies to every page, not just the visible one.
function SortHead({
  column,
  label,
  current,
  q,
  status,
  className,
}: {
  column: SortColumn;
  label: string;
  current: ListSort;
  q: string;
  status: string;
  className?: string;
}) {
  const active = current?.column === column;
  const Icon = !active ? ArrowUpDown : current.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={href({ q, status, sort: nextSort(current, column) })}
        title={`เรียงตาม${label}`}
        className={cn("hover:text-foreground inline-flex items-center gap-1", active && "text-foreground")}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </Link>
    </TableHead>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const admin = await requireAdmin();
  const canClear = admin.adminRole === "SUPER_ADMIN";
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const q = one(sp.q).trim();
  const status = one(sp.status);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const sort = parseSort(sp.sort, sp.dir);

  const where: Prisma.ProductWhereInput = {
    ...(q && {
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(status === "active" && { status: "ACTIVE" }),
    ...(status === "inactive" && { status: "INACTIVE" }),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: orderByFor(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // how many times each listed product has been opened/scanned (all time)
  const viewRows = await prisma.scanLog.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.productId) } },
    _count: { _all: true },
  });
  const views = new Map(viewRows.map((r) => [r.productId, r._count._all]));
  // counts for the whole catalogue (not the filtered list), shown in the clear-all warning
  const clearCounts = canClear ? await countClearable(prisma) : null;

  return (
    <>
      <SavedToast saved={one(sp.saved)} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="สินค้า" description={`ทั้งหมด ${total.toLocaleString("th-TH")} รายการ`} />
        <Button render={<Link href="/admin/products/new" />}>
          <Plus />
          เพิ่มสินค้า
        </Button>
      </div>

      {isLocalBaseUrl() && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          QR ตอนนี้ชี้ไปที่ <code>{getBaseUrl()}</code> ซึ่งใช้ได้เฉพาะเครื่องนี้ ห้ามพิมพ์ไปติดสินค้า
          ตั้งค่า <code>APP_URL</code> เป็นโดเมนจริงก่อน
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action="/admin/products" className="flex max-w-sm flex-1 gap-2">
          <Input name="q" defaultValue={q} placeholder="ค้นหา SKU หรือชื่อสินค้า" />
          {status && <input type="hidden" name="status" value={status} />}
          {sort && <input type="hidden" name="sort" value={sort.column} />}
          {sort && <input type="hidden" name="dir" value={sort.dir} />}
          <Button type="submit" variant="outline" size="icon" aria-label="ค้นหา">
            <Search />
          </Button>
        </form>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={status === f.value ? "secondary" : "ghost"}
              size="sm"
              render={<Link href={href({ q, status: f.value, sort })} />}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <SortHead column="sku" label="SKU" current={sort} q={q} status={status} />
              <SortHead column="name" label="ชื่อสินค้า" current={sort} q={q} status={status} />
              <TableHead>หมวดหมู่</TableHead>
              <SortHead column="price" label="ราคา" current={sort} q={q} status={status} className="text-right" />
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right" title="จำนวนครั้งที่มีคนเปิดดูหรือสแกน QR">
                เข้าดู
              </TableHead>
              <TableHead className="w-40 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  {q || status ? "ไม่พบสินค้าที่ตรงกับเงื่อนไข" : "ยังไม่มีสินค้า"}
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow key={p.productId}>
                <TableCell>
                  <div className="bg-muted text-muted-foreground relative flex size-10 items-center justify-center overflow-hidden rounded-md">
                    {p.images[0] ? (
                      <Image src={p.images[0].imagePath} alt="" fill sizes="40px" className="object-cover" />
                    ) : (
                      <ImageIcon className="size-4" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{p.sku}</TableCell>
                <TableCell className="max-w-64 truncate">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category ?? "-"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatPrice(p.price)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "ACTIVE" ? "secondary" : "outline"}>
                    {p.status === "ACTIVE" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{(views.get(p.productId) ?? 0).toLocaleString("th-TH")}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ดูตัวอย่างหน้าสาธารณะ ${p.sku} (ไม่นับเป็นการเข้าดู)`}
                      title="ดูตัวอย่างหน้าสาธารณะ (ไม่นับเป็นการเข้าดู)"
                      render={<Link href={`/p/${p.productId}?preview=1`} target="_blank" />}
                    >
                      <ExternalLink />
                    </Button>
                    {/* plain <a>, not <Link>: Link would try to prefetch the PNG */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ดาวน์โหลด QR ${p.sku}`}
                      title="ดาวน์โหลด QR"
                      render={<a href={`/admin/products/${p.productId}/qr?download=1`} download />}
                    >
                      <QrCode />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`แก้ไข ${p.sku}`}
                      render={<Link href={`/admin/products/${p.productId}`} />}
                    >
                      <Pencil />
                    </Button>
                    <DeleteProductButton productId={p.productId} label={`${p.sku} ${p.name}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            หน้า {page} จาก {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              render={<Link href={href({ q, status, page: page - 1, sort })} />}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              render={<Link href={href({ q, status, page: page + 1, sort })} />}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}

      {clearCounts && <ClearAllProducts counts={clearCounts} />}
    </>
  );
}
