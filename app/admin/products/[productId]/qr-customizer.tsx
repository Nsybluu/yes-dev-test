"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BACKGROUND_ERROR,
  QR_DEFAULT_BACKGROUND,
  QR_DEFAULT_SIZE,
  QR_RECOMMENDED_MIN_SIZE,
  QR_SIZES,
  isScannableBackground,
  normalizeHex,
} from "@/lib/qr-style/options";

const SWATCHES = [
  { label: "ขาว", hex: "#ffffff" },
  { label: "ครีม", hex: "#fff8e7" },
  { label: "เหลืองอ่อน", hex: "#fde68a" },
  { label: "ฟ้าอ่อน", hex: "#dbeafe" },
  { label: "ชมพูอ่อน", hex: "#fce7f3" },
  { label: "เทาอ่อน", hex: "#e5e7eb" },
];

const sizeItems = QR_SIZES.map((s) => ({
  value: String(s),
  label: `${s} × ${s} px${s === QR_RECOMMENDED_MIN_SIZE ? " (ขั้นต่ำที่แนะนำ)" : s === QR_DEFAULT_SIZE ? " (ค่าเริ่มต้น)" : ""}`,
}));

// The preview is drawn by the same server route that makes the download, so what you see
// is exactly what you get. The server re-checks size and colour, so this UI is a convenience.
export function QrCustomizer({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) {
  const [background, setBackground] = useState(QR_DEFAULT_BACKGROUND);
  const [size, setSize] = useState<number>(QR_DEFAULT_SIZE);
  // the colour picker fires on every drag step; wait a moment before asking for a new image
  const [previewBg, setPreviewBg] = useState(QR_DEFAULT_BACKGROUND);

  const color = normalizeHex(background) ?? QR_DEFAULT_BACKGROUND;
  const scannable = isScannableBackground(color);

  useEffect(() => {
    if (!scannable) return; // keep showing the last good preview
    const t = setTimeout(() => setPreviewBg(color), 250);
    return () => clearTimeout(t);
  }, [color, scannable]);

  const base = `/admin/products/${productId}/qr`;
  const bgParam = (hex: string) => `bg=${hex.slice(1)}`;
  const previewSrc = `${base}?size=448&${bgParam(previewBg)}`;
  const downloadHref = `${base}?download=1&size=${size}&${bgParam(color)}`;
  const isDefault = color === QR_DEFAULT_BACKGROUND && size === QR_DEFAULT_SIZE;

  return (
    <div className="grid gap-3">
      <div
        className="rounded-md border p-1"
        style={{ backgroundColor: previewBg }}
      >
        {/* the route already returns a finished PNG, so skip Next's image optimizer */}
        <Image
          key={previewSrc}
          src={previewSrc}
          alt={`QR Code ของ ${sku}`}
          width={224}
          height={224}
          unoptimized
          loading="eager"
          className="size-full"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="qr-bg">สีพื้นหลัง</Label>
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              title={s.label}
              aria-label={`สีพื้นหลัง ${s.label}`}
              aria-pressed={color === s.hex}
              onClick={() => setBackground(s.hex)}
              className={cn(
                "size-8 rounded-full border transition",
                color === s.hex
                  ? "ring-foreground ring-2 ring-offset-2"
                  : "hover:scale-110",
              )}
              style={{ backgroundColor: s.hex }}
            />
          ))}
          <input
            id="qr-bg"
            type="color"
            value={color}
            onChange={(e) => setBackground(e.target.value)}
            aria-label="เลือกสีพื้นหลังเอง"
            className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          />
          <code className="text-muted-foreground text-xs">{color}</code>
        </div>
        {!scannable && (
          <p role="alert" className="text-destructive text-xs">
            {BACKGROUND_ERROR}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="qr-size">ขนาดไฟล์</Label>
        <Select
          name="qr-size"
          items={sizeItems}
          value={String(size)}
          onValueChange={(v) => setSize(Number(v))}
        >
          <SelectTrigger id="qr-size" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeItems.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scannable ? (
        <Button render={<a href={downloadHref} download />}>
          <Download />
          ดาวน์โหลด QR (PNG {size}px)
        </Button>
      ) : (
        <Button disabled>
          <Download />
          ดาวน์โหลด QR
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isDefault}
        onClick={() => {
          setBackground(QR_DEFAULT_BACKGROUND);
          setSize(QR_DEFAULT_SIZE);
        }}
      >
        <RotateCcw />
        คืนค่าเริ่มต้น (ขาว, {QR_DEFAULT_SIZE}px)
      </Button>
      <p className="text-muted-foreground text-xs">
        ตัว QR เป็นสีดำเสมอ เปลี่ยนได้เฉพาะสีพื้นหลัง
        (ต้องเป็นสีอ่อนเพื่อให้สแกนได้) ปรับสีหรือขนาดแล้ว ลิงก์ที่ฝังใน QR
        ยังเป็นลิงก์เดิม
      </p>
    </div>
  );
}
