import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

// Only fields a customer should see; inactive products are treated as missing.
// Read on every request (no caching) so edits show up for already-printed QRs.
async function getProduct(productId: string) {
  return prisma.product.findFirst({
    where: { productId, status: "ACTIVE" },
    select: {
      sku: true,
      name: true,
      category: true,
      price: true,
      size: true,
      description: true,
      howToUse: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { productImageId: true, imagePath: true },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[productId]">): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);
  return { title: product?.name ?? "ไม่พบสินค้า" };
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
      <p className="text-base leading-7 break-words whitespace-pre-line">{children}</p>
    </section>
  );
}

export default async function ProductPage({ params }: PageProps<"/p/[productId]">) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-12 sm:py-8">
      <ProductGallery images={product.images} name={product.name} />

      <div className="mt-6 grid gap-6">
        <header className="grid gap-2">
          {product.category && (
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {product.category}
            </p>
          )}
          <h1 className="text-2xl leading-snug font-semibold break-words">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
        </header>

        <dl className="grid grid-cols-2 gap-4 border-y py-4 text-sm">
          <div className="grid gap-1">
            <dt className="text-muted-foreground">รหัสสินค้า</dt>
            <dd className="font-medium">{product.sku}</dd>
          </div>
          {product.size && (
            <div className="grid gap-1">
              <dt className="text-muted-foreground">ขนาด</dt>
              <dd className="font-medium">{product.size}</dd>
            </div>
          )}
        </dl>

        {product.description && <Section title="รายละเอียด">{product.description}</Section>}
        {product.howToUse && <Section title="วิธีใช้">{product.howToUse}</Section>}
      </div>
    </main>
  );
}
