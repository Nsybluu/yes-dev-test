import { DEVICE_LABELS, parseUserAgent } from "@/lib/scans/devices";

// Decides which visits to the public product page count as a "scan", and turns
// stored user agents into something readable. Pure functions, easy to test.

// Crawlers and link-preview fetchers open pages without a person behind them.
// A missing user agent is treated the same way.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|embedly|headless|lighthouse|uptime|monitor|curl|wget|python-requests|httpclient|go-http-client/i;

export function looksLikeBot(userAgent: string | null | undefined) {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export type ScanSkipReason = "bot" | "prefetch" | "preview";

type HeaderLike = { get(name: string): string | null };

// null = count it. A scan is someone opening the product link or scanning its QR.
// Skipped:
//  - bots and link-preview fetchers
//  - Next.js's own <Link> prefetch, when the header reaches us (the public page's links
//    are also prefetch={false}, so none is expected; the click is a separate, counted request)
//  - the back office "preview" button, which opens the page with ?preview=1: an admin
//    checking a product is neither a customer opening the link nor a QR scan
// Browser-level prefetch/prerender (Sec-Purpose) is deliberately NOT skipped: Chrome reuses
// that response when the person really opens the page and never asks the server again,
// so skipping it would lose real visits.
export function scanSkipReason(headers: HeaderLike, preview?: string | string[]): ScanSkipReason | null {
  if (headers.get("next-router-prefetch")) return "prefetch";
  if (looksLikeBot(headers.get("user-agent"))) return "bot";
  if ((Array.isArray(preview) ? preview[0] : preview) === "1") return "preview";
  return null;
}

// "มือถือ · iOS" for the recent-scans table; the dashboard charts use lib/scans/devices.ts
export function deviceFromUserAgent(userAgent: string | null | undefined) {
  const { type, os } = parseUserAgent(userAgent);
  if (type === "unknown") return DEVICE_LABELS.unknown;
  return os === "other" || os === "unknown" ? DEVICE_LABELS[type] : `${DEVICE_LABELS[type]} · ${os}`;
}

export const MAX_USER_AGENT_LENGTH = 300;

export type ScanRange = "all" | "30d" | "7d";
export const SCAN_RANGES: { value: ScanRange; label: string; days: number | null }[] = [
  { value: "all", label: "ทั้งหมด", days: null },
  { value: "30d", label: "30 วันล่าสุด", days: 30 },
  { value: "7d", label: "7 วันล่าสุด", days: 7 },
];

export function parseRange(value: string | string[] | undefined): ScanRange {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "30d" || v === "7d" ? v : "all";
}

export function rangeStart(range: ScanRange, now = new Date()): Date | undefined {
  const days = SCAN_RANGES.find((r) => r.value === range)?.days;
  return days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : undefined;
}
