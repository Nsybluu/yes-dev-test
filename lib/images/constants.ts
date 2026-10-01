// Image rules shared by the server (lib/images/validation.ts) and the upload UI.
// No imports here: this file must stay safe to bundle for the browser.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 8; // 1 main image + up to 7 gallery images
export const RECOMMENDED_SIDE = 800;

export const ALLOWED_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
export type AllowedExt = keyof typeof ALLOWED_TYPES;

export const ACCEPT_ATTR = Object.values(ALLOWED_TYPES).join(",");
export const RULES_TEXT = "JPG, PNG หรือ WEBP ไม่เกิน 2 MB";
export const RECOMMENDATION_TEXT = `แนะนำภาพสี่เหลี่ยมจัตุรัส อย่างน้อย ${RECOMMENDED_SIDE} × ${RECOMMENDED_SIDE} px`;
