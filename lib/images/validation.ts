import { imageSize } from "image-size";
import {
  ALLOWED_TYPES,
  MAX_IMAGE_BYTES,
  RECOMMENDATION_TEXT,
  RECOMMENDED_SIDE,
  type AllowedExt,
} from "@/lib/images/constants";

// A 2MB file can still decode to a huge bitmap, so cap the pixel size too
const MAX_SIDE = 8000;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

export type ImageCheck =
  | { ok: true; ext: AllowedExt; width: number; height: number; warning: string | null }
  | { ok: false; error: string };

// Judges the real bytes. The file name and the browser-reported MIME type are
// ignored on purpose: both are chosen by the sender.
export function inspectImage(buffer: Uint8Array, fileName = "ไฟล์"): ImageCheck {
  if (buffer.byteLength === 0) return { ok: false, error: `${fileName}: ไฟล์ว่างเปล่า` };
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `${fileName}: ไฟล์ใหญ่เกินไป (${mb(buffer.byteLength)} MB) รองรับไม่เกิน 2 MB`,
    };
  }

  let info: ReturnType<typeof imageSize>;
  try {
    info = imageSize(buffer);
  } catch {
    return { ok: false, error: `${fileName}: ไม่ใช่ไฟล์ภาพที่ระบบอ่านได้ ใช้ได้เฉพาะ JPG, PNG หรือ WEBP` };
  }

  const ext = info.type === "jpeg" ? "jpg" : info.type;
  if (!ext || !(ext in ALLOWED_TYPES)) {
    return {
      ok: false,
      error: `${fileName}: ชนิดไฟล์ไม่รองรับ (${info.type ?? "ไม่ทราบ"}) ใช้ได้เฉพาะ JPG, PNG หรือ WEBP`,
    };
  }

  const { width, height } = info;
  if (!width || !height) return { ok: false, error: `${fileName}: อ่านขนาดภาพไม่ได้` };
  if (width > MAX_SIDE || height > MAX_SIDE) {
    return { ok: false, error: `${fileName}: ภาพมีขนาดใหญ่เกินไป (${width}×${height} px) ไม่เกิน ${MAX_SIDE}×${MAX_SIDE} px` };
  }

  // The size guideline is a recommendation, so it warns instead of rejecting
  const problems: string[] = [];
  if (width !== height) problems.push("ไม่ใช่สี่เหลี่ยมจัตุรัส");
  if (Math.min(width, height) < RECOMMENDED_SIDE) problems.push(`เล็กกว่า ${RECOMMENDED_SIDE}×${RECOMMENDED_SIDE} px`);
  const warning = problems.length
    ? `${fileName}: อัปโหลดแล้ว แต่ภาพขนาด ${width}×${height} px ${problems.join(" และ ")} (${RECOMMENDATION_TEXT})`
    : null;

  return { ok: true, ext: ext as AllowedExt, width, height, warning };
}
