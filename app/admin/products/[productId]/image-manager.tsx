"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_ATTR,
  ALLOWED_TYPES,
  MAX_IMAGES_PER_PRODUCT,
  MAX_IMAGE_BYTES,
  RECOMMENDATION_TEXT,
  RULES_TEXT,
} from "@/lib/images/constants";
import {
  deleteProductImage,
  setMainImage,
  uploadProductImage,
} from "@/app/admin/products/[productId]/image-actions";

export type ManagedImage = { productImageId: string; imagePath: string; imageName: string };

type Message = { kind: "error" | "warning"; text: string };

const allowedMime = new Set<string>(Object.values(ALLOWED_TYPES));

export function ImageManager({ productId, images }: { productId: string; images: ManagedImage[] }) {
  const mainInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [toDelete, setToDelete] = useState<ManagedImage | null>(null);

  const main = images[0];
  const gallery = images.slice(1);
  const galleryFull = images.length >= MAX_IMAGES_PER_PRODUCT;
  const galleryCapacity = MAX_IMAGES_PER_PRODUCT - 1;

  async function upload(files: FileList | null, role: "main" | "gallery") {
    if (!files || files.length === 0) return;
    const picked = [...files];
    // Reset so choosing the same file again still fires onChange
    if (mainInput.current) mainInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";

    setMessages([]);
    setBusy("กำลังอัปโหลด...");
    const next: Message[] = [];
    let uploaded = 0;

    // One file per request: keeps each request small and gives a reason per file
    for (const file of picked) {
      // Quick checks for fast feedback; the server checks the real file again
      if (file.size > MAX_IMAGE_BYTES) {
        next.push({
          kind: "error",
          text: `${file.name}: ไฟล์ใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)} MB) รองรับไม่เกิน 2 MB`,
        });
        continue;
      }
      if (file.type && !allowedMime.has(file.type)) {
        next.push({ kind: "error", text: `${file.name}: ชนิดไฟล์ไม่รองรับ ใช้ได้เฉพาะ JPG, PNG หรือ WEBP` });
        continue;
      }

      const form = new FormData();
      form.set("file", file);
      try {
        // with several files picked for "main", only the first one is the main image
        const result = await uploadProductImage(productId, role === "main" && uploaded > 0 ? "gallery" : role, form);
        if (result.ok) {
          uploaded++;
          if (result.warning) next.push({ kind: "warning", text: result.warning });
        } else {
          next.push({ kind: "error", text: `${file.name}: ${result.error.replace(`${file.name}: `, "")}` });
        }
      } catch {
        next.push({ kind: "error", text: `${file.name}: อัปโหลดไม่สำเร็จ กรุณาลองใหม่` });
      }
    }

    setBusy(null);
    setMessages(next);
    if (uploaded > 0) toast.success(`อัปโหลดรูปแล้ว ${uploaded} รูป`);
  }

  async function run(label: string, action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setMessages([]);
    setBusy(label);
    try {
      const result = await action();
      if (result.ok) toast.success(success);
      else setMessages([{ kind: "error", text: result.error ?? "ดำเนินการไม่สำเร็จ" }]);
    } catch {
      setMessages([{ kind: "error", text: "ดำเนินการไม่สำเร็จ กรุณาลองใหม่" }]);
    }
    setBusy(null);
  }

  const disabled = busy !== null;

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div className="grid gap-1">
        <h2 className="font-medium">รูปสินค้า</h2>
        <p className="text-muted-foreground text-xs">
          {RULES_TEXT} · {RECOMMENDATION_TEXT} · รูปแรกคือรูปหลัก ที่เหลือเป็นรูป Gallery ในหน้าสินค้า
          (รวมไม่เกิน {MAX_IMAGES_PER_PRODUCT} รูป) รูปบันทึกทันทีที่อัปโหลด ไม่ต้องกดบันทึกการแก้ไข
        </p>
      </div>

      <input
        ref={mainInput}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        data-testid="main-input"
        onChange={(e) => upload(e.target.files, "main")}
      />
      <input
        ref={galleryInput}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        data-testid="gallery-input"
        onChange={(e) => upload(e.target.files, "gallery")}
      />

      <div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
        {/* main image */}
        <div className="grid content-start gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            รูปหลัก <Badge variant="secondary">แสดงเป็นหลัก</Badge>
          </div>
          <div className="bg-muted text-muted-foreground relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl">
            {main ? (
              <Image src={main.imagePath} alt="รูปหลัก" fill sizes="192px" className="object-cover" />
            ) : (
              <div className="grid justify-items-center gap-1 text-sm">
                <ImageIcon className="size-8 stroke-1" />
                ยังไม่มีรูปหลัก
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              variant={main ? "outline" : "default"}
              disabled={disabled}
              onClick={() => mainInput.current?.click()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}
              {main ? "เปลี่ยนรูปหลัก" : "อัปโหลดรูปหลัก"}
            </Button>
            {main && (
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="ลบรูปหลัก"
                disabled={disabled}
                onClick={() => setToDelete(main)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
          {main && <p className="text-muted-foreground text-xs">รูปหลักเดิมจะถูกแทนที่</p>}
        </div>

        {/* gallery */}
        <div className="grid content-start gap-2">
          <div className="text-sm font-medium">
            Gallery{" "}
            <span className="text-muted-foreground font-normal">
              ({gallery.length}/{galleryCapacity})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {gallery.map((image) => (
              <div key={image.productImageId} className="grid gap-1">
                <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                  <Image src={image.imagePath} alt={image.imageName} fill sizes="120px" className="object-cover" />
                </div>
                <div className="flex justify-between">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title="ตั้งเป็นรูปหลัก"
                    aria-label={`ตั้ง ${image.imageName} เป็นรูปหลัก`}
                    disabled={disabled}
                    onClick={() =>
                      run("กำลังตั้งรูปหลัก...", () => setMainImage(productId, image.productImageId), "ตั้งเป็นรูปหลักแล้ว")
                    }
                  >
                    <Star />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title="ลบรูป"
                    aria-label={`ลบ ${image.imageName}`}
                    disabled={disabled}
                    onClick={() => setToDelete(image)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            {!galleryFull && (
              <button
                type="button"
                disabled={disabled || !main}
                onClick={() => galleryInput.current?.click()}
                className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <Plus className="size-5" />
                เพิ่มรูป
              </button>
            )}
          </div>
          {!main && <p className="text-muted-foreground text-xs">อัปโหลดรูปหลักก่อน จึงจะเพิ่มรูป Gallery ได้</p>}
          {galleryFull && (
            <p className="text-muted-foreground text-xs">ครบ {MAX_IMAGES_PER_PRODUCT} รูปแล้ว ลบรูปก่อนจึงจะเพิ่มใหม่ได้</p>
          )}
        </div>
      </div>

      {busy && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
          <Loader2 className="size-4 animate-spin" />
          {busy}
        </p>
      )}
      {messages.length > 0 && (
        <ul className="grid gap-1 text-sm" role="alert">
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.kind === "error"
                  ? "text-destructive"
                  : "rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1"
              }
            >
              {m.text}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรูปนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.productImageId === main?.productImageId && gallery.length > 0
                ? "รูปนี้เป็นรูปหลัก ถ้าลบ รูปแรกใน Gallery จะกลายเป็นรูปหลักแทน "
                : ""}
              ไฟล์รูปจะถูกลบถาวรและกู้คืนไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                const target = toDelete;
                setToDelete(null);
                if (target) {
                  void run("กำลังลบรูป...", () => deleteProductImage(productId, target.productImageId), "ลบรูปแล้ว");
                }
              }}
            >
              ลบรูป
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
