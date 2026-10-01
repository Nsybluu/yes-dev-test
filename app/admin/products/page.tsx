import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImageIcon, Pencil, Plus, Search } from "lucide-react";
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
import { prisma } from "@/lib/prisma";
import { DeleteProductButton } from "@/app/admin/products/delete-product-button";
import { ClearAllProducts } from "@/app/admin/products/clear-all-products";
import { countClearable } from "@/lib/products/clear";
import { SavedToast } from "@/app/admin/products/saved-toast";
import type { Prisma } from "@/app/generated/prisma/client";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "", label: "ทั้งหมด" },
  { value: "active", label: "เปิดใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
] as const;

function href(params: { q?: string; status?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const admin = await requireAdmin();
  const canClear = admin.adminRole === "SUPER_ADMIN";
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const q = one(sp.q).trim();
  const status = one(sp.status);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
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

      <div className="flex flex-wrap items-center gap-3">
        <form action="/admin/products" className="flex max-w-sm flex-1 gap-2">
          <Input name="q" defaultValue={q} placeholder="ค้นหา SKU หรือชื่อสินค้า" />
          {status && <input type="hidden" name="status" value={status} />}
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
              render={<Link href={href({ q, status: f.value })} />}
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
              <TableHead>SKU</TableHead>
              <TableHead>ชื่อสินค้า</TableHead>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead className="text-right">ราคา</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-32 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
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
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ดูหน้าสาธารณะ ${p.sku}`}
                      render={<Link href={`/p/${p.productId}`} target="_blank" />}
                    >
                      <ExternalLink />
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
              render={<Link href={href({ q, status, page: page - 1 })} />}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              render={<Link href={href({ q, status, page: page + 1 })} />}
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
