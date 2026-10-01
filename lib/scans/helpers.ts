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

// null = count it. The admin "view public page" buttons add ?preview=1 so an
// admin checking a product doesn't inflate its numbers.
export function scanSkipReason(headers: HeaderLike, preview: string | string[] | undefined): ScanSkipReason | null {
  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose) || headers.get("next-router-prefetch")) return "prefetch";
  if (looksLikeBot(headers.get("user-agent"))) return "bot";
  if ((Array.isArray(preview) ? preview[0] : preview) === "1") return "preview";
  return null;
}

export function deviceFromUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "ไม่ทราบ";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "มือถือ/แท็บเล็ต" : "คอมพิวเตอร์";
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
