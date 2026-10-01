import Image from "next/image";
import { ImageIcon } from "lucide-react";

type GalleryImage = { productImageId: string; imagePath: string };

// No client JS: multiple images use CSS scroll-snap, and the next image
// peeks in from the right so it's obvious the strip can be swiped.
export function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  if (images.length === 0) {
    return (
      <div
        role="img"
        aria-label="ยังไม่มีรูปสินค้า"
        className="bg-muted text-muted-foreground flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl"
      >
        <ImageIcon className="size-10 stroke-1" />
        <span className="text-sm">ยังไม่มีรูปสินค้า</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-2xl">
        <Image
          src={images[0].imagePath}
          alt={name}
          fill
          preload
          sizes="(max-width: 448px) 100vw, 448px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {images.map((image, i) => (
        <div
          key={image.productImageId}
          className="bg-muted relative aspect-square w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl"
        >
          <Image
            src={image.imagePath}
            alt={`${name} (${i + 1}/${images.length})`}
            fill
            preload={i === 0}
            sizes="(max-width: 448px) 88vw, 400px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
