// Works out what kind of device opened a product page, from the User-Agent text that
// every browser sends with every request. Pure functions, no database, easy to test.
//
// This is a best guess made from patterns in text the visitor's browser chose to send,
// not a measurement: a phone using "Desktop site" mode, or an iPad (which reports itself
// as a Mac), will be classified by what it claims to be.

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export type OsName = "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "ChromeOS" | "other" | "unknown";

export const DEVICE_LABELS: Record<DeviceType, string> = {
  mobile: "มือถือ",
  tablet: "แท็บเล็ต",
  desktop: "คอมพิวเตอร์",
  unknown: "ไม่ทราบ",
};

export const OS_LABELS: Record<OsName, string> = {
  iOS: "iOS (iPhone/iPad)",
  Android: "Android",
  Windows: "Windows",
  macOS: "macOS",
  Linux: "Linux",
  ChromeOS: "ChromeOS",
  other: "อื่นๆ",
  unknown: "ไม่ทราบ",
};

export type ParsedDevice = { type: DeviceType; os: OsName };

// Order matters: Android user agents also say "Linux", and iPads also say "Mac OS X".
function detectOs(ua: string): OsName {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
  if (/Linux|X11/.test(ua)) return "Linux";
  return "other";
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedDevice {
  const ua = (userAgent ?? "").trim();
  if (!ua) return { type: "unknown", os: "unknown" };
  const os = detectOs(ua);

  // Android phones say "Mobile", Android tablets do not. iPads say "iPad".
  const tablet = /iPad|Tablet|PlayBook|Kindle|Silk/i.test(ua) || (/Android/.test(ua) && !/Mobile/i.test(ua));
  if (tablet) return { type: "tablet", os };
  if (/iPhone|iPod|Windows Phone|Mobi/i.test(ua) || os === "Android") return { type: "mobile", os };
  if (os === "Windows" || os === "macOS" || os === "Linux" || os === "ChromeOS") return { type: "desktop", os };
  return { type: "unknown", os };
}

export type Count<K extends string> = { key: K; label: string; count: number; share: number };
export type DeviceSummary = {
  total: number;
  types: Count<DeviceType>[];
  systems: Count<OsName>[];
};

// Input is the number of scans per distinct User-Agent string, so a million scans from a
// few hundred different strings only needs a few hundred rows to be classified.
export function summarizeDevices(rows: { userAgent: string | null; count: number }[]): DeviceSummary {
  const types = new Map<DeviceType, number>();
  const systems = new Map<OsName, number>();
  let total = 0;
  for (const row of rows) {
    const { type, os } = parseUserAgent(row.userAgent);
    types.set(type, (types.get(type) ?? 0) + row.count);
    systems.set(os, (systems.get(os) ?? 0) + row.count);
    total += row.count;
  }

  const build = <K extends string>(map: Map<K, number>, labels: Record<K, string>): Count<K>[] =>
    [...map.entries()]
      .map(([key, count]) => ({ key, label: labels[key], count, share: total ? count / total : 0 }))
      // biggest first; on a tie "unknown" goes last, then by name, so the order is the same on every load
      .sort(
        (a, b) =>
          b.count - a.count ||
          Number(a.key === "unknown") - Number(b.key === "unknown") ||
          a.label.localeCompare(b.label, "th"),
      );

  return { total, types: build(types, DEVICE_LABELS), systems: build(systems, OS_LABELS) };
}
