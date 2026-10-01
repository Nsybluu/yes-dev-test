"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryImage = { productImageId: string; imagePath: string };

const FRAME = "relative aspect-square w-full overflow-hidden rounded-3xl bg-muted shadow-sm ring-1 ring-black/5";

// Main image (the first one) with the gallery as thumbnails underneath. Works with
// a swipe on touch screens, arrows on desktop and the thumbnails everywhere.
export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const swipeStart = useRef<number | null>(null);

  if (images.length === 0) {
    return (
      <div
        role="img"
        aria-label="ยังไม่มีรูปสินค้า"
        className={cn(FRAME, "from-brand-soft to-muted flex flex-col items-center justify-center gap-3 bg-gradient-to-br text-center")}
      >
        <span className="bg-background/70 text-brand flex size-20 items-center justify-center rounded-full shadow-sm">
          <ImageIcon className="size-9 stroke-[1.5]" />
        </span>
        <span className="text-muted-foreground text-sm">ยังไม่มีรูปสินค้า</span>
      </div>
    );
  }

  const many = images.length > 1;
  const go = (i: number) => setIndex((i + images.length) % images.length);

  return (
    <div className="grid gap-3">
      <div
        className={cn(FRAME, "touch-pan-y select-none")}
        onPointerDown={(e) => (swipeStart.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeStart.current === null) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = null;
          if (many && Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {/* all images are stacked and cross-faded, so switching is instant */}
        {images.map((image, i) => (
          <Image
            key={image.productImageId}
            src={image.imagePath}
            alt={many ? `${name} (${i + 1}/${images.length})` : name}
            fill
            preload={i === 0}
            draggable={false}
            sizes="(max-width: 1024px) 100vw, 560px"
            className={cn("object-cover transition-opacity duration-300", i === index ? "opacity-100" : "opacity-0")}
          />
        ))}

        {many && (
          <>
            <button
              type="button"
              aria-label="รูปก่อนหน้า"
              onClick={() => go(index - 1)}
              className="bg-background/80 hover:bg-background absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm backdrop-blur transition md:flex"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="รูปถัดไป"
              onClick={() => go(index + 1)}
              className="bg-background/80 hover:bg-background absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm backdrop-blur transition md:flex"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
              {images.map((image, i) => (
                <span
                  key={image.productImageId}
                  className={cn("h-1.5 rounded-full bg-white/90 shadow transition-all", i === index ? "w-5" : "w-1.5 opacity-60")}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {many && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, i) => (
            <button
              key={image.productImageId}
              type="button"
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "bg-muted relative size-16 shrink-0 overflow-hidden rounded-xl ring-2 transition sm:size-20",
                i === index ? "ring-brand" : "ring-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={image.imagePath} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
