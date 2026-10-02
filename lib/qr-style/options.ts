// Rules for customising a QR code (background colour and size). No imports on purpose:
// the browser (to warn before asking) and the server (to enforce) use the same file.
//
// The squares of the code stay black. A scanner needs dark squares on a clearly lighter
// background, so the background may be changed freely only while it stays light enough.

export const QR_SIZES = [800, 1024, 1500, 2000, 3000, 4000] as const;
export const QR_DEFAULT_SIZE = 1024;
export const QR_RECOMMENDED_MIN_SIZE = 800;
// the server also serves small sizes (for the on-page preview), but nothing under this
export const QR_MIN_SIZE = 200;
export const QR_MAX_SIZE = 4000;

export const QR_DEFAULT_BACKGROUND = "#ffffff";
// WCAG "enhanced" contrast against black. Light backgrounds pass easily (white ~21:1,
// yellow ~19:1, mid grey #999 ~7.4:1); anything darker than a light grey is refused.
export const QR_MIN_CONTRAST = 7;

export type QrOptions = { size: number; background: string };

/** "fff", "#FFF", "ffffff" -> "#ffffff"; anything else -> null */
export function normalizeHex(input: string | null | undefined): string | null {
  const v = (input ?? "").trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`;
  if (/^[0-9a-f]{6}$/.test(v)) return `#${v}`;
  return null;
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  const h = normalizeHex(hex);
  if (!h) return 0;
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** is this background light enough for black squares to be read reliably? */
export function isScannableBackground(hex: string) {
  return contrastRatio(hex, "#000000") >= QR_MIN_CONTRAST;
}

export const BACKGROUND_ERROR = "สีพื้นหลังเข้มเกินไป สแกนไม่ได้ ให้เลือกสีที่อ่อนกว่านี้ (ตัว QR เป็นสีดำ)";

type ParamsLike = { get(name: string): string | null };

export function parseQrOptions(params: ParamsLike): { ok: true; options: QrOptions } | { ok: false; error: string } {
  let size = QR_DEFAULT_SIZE;
  const rawSize = params.get("size");
  if (rawSize !== null) {
    if (!/^\d{1,5}$/.test(rawSize)) return { ok: false, error: "ขนาดต้องเป็นตัวเลข (px)" };
    size = Number(rawSize);
    if (size < QR_MIN_SIZE || size > QR_MAX_SIZE) {
      return { ok: false, error: `ขนาดต้องอยู่ระหว่าง ${QR_MIN_SIZE}–${QR_MAX_SIZE} px` };
    }
  }

  let background = QR_DEFAULT_BACKGROUND;
  const rawBg = params.get("bg");
  if (rawBg !== null) {
    const hex = normalizeHex(rawBg);
    if (!hex) return { ok: false, error: "รูปแบบสีไม่ถูกต้อง (ใช้รหัสสีแบบ hex เช่น ffffff)" };
    if (!isScannableBackground(hex)) return { ok: false, error: BACKGROUND_ERROR };
    background = hex;
  }

  return { ok: true, options: { size, background } };
}
