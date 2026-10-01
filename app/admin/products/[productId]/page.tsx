import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { updateProduct } from "@/app/admin/products/actions";
import { ProductForm } from "@/app/admin/products/product-form";
import { QrCard } from "@/app/admin/products/[productId]/qr-card";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[productId]">) {
  await requireAdmin();
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { productId } });
  if (!product) notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="แก้ไขสินค้า" description={`${product.sku} · ${product.name}`} />
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/p/${product.productId}`} target="_blank" />}
        >
          <ExternalLink />
          ดูหน้าสาธารณะ
        </Button>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,42rem)_16rem]">
        <ProductForm
          action={updateProduct.bind(null, product.productId)}
          submitLabel="บันทึกการแก้ไข"
          initial={{
            sku: product.sku,
            name: product.name,
            category: product.category ?? "",
            price: product.price.toString(),
            size: product.size ?? "",
            description: product.description ?? "",
            howToUse: product.howToUse ?? "",
            status: product.status.toLowerCase(),
          }}
        />
        <QrCard productId={product.productId} sku={product.sku} />
      </div>
    </>
  );
}
