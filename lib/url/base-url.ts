// Reads APP_URL leniently. It ends up inside every QR code and every invite link, and
// a value like "172.20.10.2:3000" (no http://) produces text that no phone or browser
// treats as a link, so a missing scheme is repaired instead of trusted.

export type BaseUrlKind = "localhost" | "lan" | "public";

export type BaseUrlInfo = {
  /** the value actually used: always http(s)://host[:port], no trailing slash */
  url: string;
  kind: BaseUrlKind;
  /** the scheme was missing and we added it */
  addedScheme: boolean;
  /** APP_URL was set but unusable, so the default was used instead */
  invalid: boolean;
  /** what was written in .env, for messages */
  raw: string;
};

const DEFAULT_URL = "http://localhost:3000";

const isIpv4 = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

function isLocalhost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");
}

// 10.x, 172.16-31.x, 192.168.x, 169.254.x and *.local only work inside the same network
function isPrivate(host: string) {
  if (host.endsWith(".local")) return true;
  if (!isIpv4(host)) return false;
  const [a, b] = host.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

export function parseBaseUrl(input: string | undefined): BaseUrlInfo {
  const raw = (input ?? "").trim().replace(/^["']|["']$/g, "").trim();
  if (!raw) return { url: DEFAULT_URL, kind: "localhost", addedScheme: false, invalid: false, raw: "" };

  let value = raw;
  let addedScheme = false;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    const host = value.split(/[/:?#]/)[0].toLowerCase();
    // IPs and local names are plain-http in practice; real domains are https
    const scheme = isLocalhost(host) || isIpv4(host) || host.endsWith(".local") ? "http" : "https";
    value = `${scheme}://${value}`;
    addedScheme = true;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { url: DEFAULT_URL, kind: "localhost", addedScheme: false, invalid: true, raw };
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) {
    return { url: DEFAULT_URL, kind: "localhost", addedScheme: false, invalid: true, raw };
  }

  const host = parsed.hostname.toLowerCase();
  const kind: BaseUrlKind = isLocalhost(host) ? "localhost" : isPrivate(host) ? "lan" : "public";
  return {
    url: `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, ""),
    kind,
    addedScheme,
    invalid: false,
    raw,
  };
}
