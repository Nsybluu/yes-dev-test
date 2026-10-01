import QRCode from "qrcode";
import { parseBaseUrl } from "@/lib/url/base-url";

// QR codes only carry this URL, never product data, so editing a product never
// changes its QR. What must stay stable is APP_URL and the product's productId.
export function getBaseUrlInfo() {
  return parseBaseUrl(process.env.APP_URL);
}

export function getBaseUrl() {
  return getBaseUrlInfo().url;
}

export function productUrl(productId: string) {
  return `${getBaseUrl()}/p/${productId}`;
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
