import QRCode from "qrcode";
import { QR_DEFAULT_BACKGROUND, QR_DEFAULT_SIZE, type QrOptions } from "@/lib/qr-style/options";
import { parseBaseUrl } from "@/lib/url/base-url";

const DEFAULTS: QrOptions = { size: QR_DEFAULT_SIZE, background: QR_DEFAULT_BACKGROUND };

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

// Medium error correction and the standard 4-module quiet zone. The size and the
// background colour are validated by lib/qr-style/options.ts before they get here.
export function productQrPng(productId: string, options: QrOptions = DEFAULTS) {
  return QRCode.toBuffer(productUrl(productId), {
    type: "png",
    width: options.size,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: options.background },
  });
}
