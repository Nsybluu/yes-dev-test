import QRCode from "qrcode";

// QR codes only carry this URL, never product data, so editing a product never
// changes its QR. What must stay stable is APP_URL and the product's productId.
export function getBaseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function productUrl(productId: string) {
  return `${getBaseUrl()}/p/${productId}`;
}

/** true when the QR would point at a machine nobody else can reach */
export function isLocalBaseUrl() {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(getBaseUrl());
}

// 1024px (above the 800px minimum), medium error correction, standard 4-module quiet zone
export function productQrPng(productId: string) {
  return QRCode.toBuffer(productUrl(productId), {
    type: "png",
    width: 1024,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
