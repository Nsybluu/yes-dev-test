import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Barcode, ImageIcon, ListChecks, Ruler, Sparkles } from "lucide-react";
import { ProductGallery } from "@/components/product/product-gallery";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { scanSkipReason } from "@/lib/scans/helpers";
import { getPopularActiveProducts, recordScan } from "@/lib/scans/stats";

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

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-background grid gap-3 rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="flex items-center gap-2 font-medium">
        <span className="bg-brand-soft text-brand flex size-8 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function HowToUse({ text }: { text: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2)
    return <p className="text-base leading-7 break-words">{text}</p>;
  return (
    <ol className="grid gap-3">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3">
          <span className="bg-brand text-background flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {i + 1}
          </span>
          <span className="text-base leading-7 break-words">
            {line.replace(/^\d+\s*[.)]\s*/, "")}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<"/p/[productId]">) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) notFound();

  // Every real visit is a scan: the QR code is just this URL. Bots, prefetches and
  // the admin's own "view public page" previews (?preview=1) are not counted.
  const requestHeaders = await headers();
  const skip = scanSkipReason(requestHeaders, (await searchParams).preview);
  if (!skip) {
    const userAgent = requestHeaders.get("user-agent");
    // after(): runs once the page is sent, so a slow or failing insert never affects the visitor
    after(async () => {
      try {
        await recordScan(productId, userAgent);
      } catch (error) {
        console.error("recordScan failed", error);
      }
    });
  }

  const popular = await getPopularActiveProducts(productId, 3);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:py-12">
      <div className="mx-auto grid max-w-xl items-start gap-8 lg:max-w-none lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-24">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="grid gap-5">
          <header className="grid gap-3">
            {product.category && (
              <span className="bg-brand-soft text-brand w-fit rounded-full px-3 py-1 text-xs font-medium tracking-wide">
                {product.category}
              </span>
            )}
            <h1 className="text-3xl leading-tight font-semibold break-words lg:text-4xl">
              {product.name}
            </h1>
            <p className="text-brand text-3xl font-semibold">
              {formatPrice(product.price)}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-3">
            <div className="bg-background flex items-center gap-3 rounded-2xl p-4 shadow-sm ring-1 ring-black/5">
              <Barcode className="text-brand size-5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">รหัสสินค้า</dt>
                <dd className="truncate font-medium">{product.sku}</dd>
              </div>
            </div>
            {product.size && (
              <div className="bg-background flex items-center gap-3 rounded-2xl p-4 shadow-sm ring-1 ring-black/5">
                <Ruler className="text-brand size-5 shrink-0" />
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">ขนาด</dt>
                  <dd className="truncate font-medium">{product.size}</dd>
                </div>
              </div>
            )}
          </dl>

          {product.description && (
            <Card icon={Sparkles} title="รายละเอียด">
              <p className="text-base leading-7 break-words whitespace-pre-line">
                {product.description}
              </p>
            </Card>
          )}
          {product.howToUse && (
            <Card icon={ListChecks} title="วิธีใช้">
              <HowToUse text={product.howToUse} />
            </Card>
          )}
        </div>
      </div>

      {popular.length > 0 && (
        <section className="mt-12 grid gap-4 border-t pt-8">
          <h2 className="text-xl font-semibold">สินค้ายอดนิยม</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {popular.map((p) => (
              <li key={p.productId}>
                <Link
                  href={`/p/${p.productId}`}
                  className="bg-background group flex items-center gap-3 rounded-2xl p-3 shadow-sm ring-1 ring-black/5 transition hover:shadow-md sm:flex-col sm:items-stretch"
                >
                  <div className="from-brand-soft to-muted text-brand relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br sm:aspect-square sm:size-auto">
                    {p.images[0] ? (
                      <Image
                        src={p.images[0].imagePath}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 64px, 240px"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <ImageIcon className="size-6 stroke-[1.5]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {p.category && (
                      <p className="text-muted-foreground text-xs">
                        {p.category}
                      </p>
                    )}
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-brand text-sm font-medium">
                      {formatPrice(p.price)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
