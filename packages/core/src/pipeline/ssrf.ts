import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(
    message = "This URL isn't a public web page Lyvora can fetch.",
  ) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export type LookupFn = (hostname: string) => Promise<string[]>;

export type SsrfDeps = {
  fetch?: typeof fetch;
  lookup?: LookupFn;
};

const blocked = new BlockList();
blocked.addSubnet("0.0.0.0", 8, "ipv4");
blocked.addSubnet("10.0.0.0", 8, "ipv4");
blocked.addSubnet("127.0.0.0", 8, "ipv4");
blocked.addSubnet("169.254.0.0", 16, "ipv4");
blocked.addSubnet("172.16.0.0", 12, "ipv4");
blocked.addSubnet("192.168.0.0", 16, "ipv4");
blocked.addSubnet("224.0.0.0", 4, "ipv4");
blocked.addSubnet("240.0.0.0", 4, "ipv4");
blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
blocked.addSubnet("fc00::", 7, "ipv6");
blocked.addSubnet("fe80::", 10, "ipv6");
blocked.addSubnet("ff00::", 8, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");

const MAX_REDIRECTS = 5;

function ipv4FromMapped(address: string): string | null {
  const lower = address.toLowerCase();
  if (!lower.startsWith("::ffff:")) return null;
  const rest = address.slice(7);
  if (isIP(rest) === 4) return rest;

  const parts = rest.split(":");
  if (parts.length !== 2) return null;
  const hi = Number.parseInt(parts[0]!, 16);
  const lo = Number.parseInt(parts[1]!, 16);
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

export function isBlockedIp(address: string): boolean {
  const trimmed = address.trim().replace(/^\[|\]$/g, "");
  const version = isIP(trimmed);
  if (!version) return false;

  const mapped = ipv4FromMapped(trimmed);
  if (mapped && isBlockedIp(mapped)) return true;

  return blocked.check(trimmed, version === 6 ? "ipv6" : "ipv4");
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "localhost.localdomain") return true;
  if (host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  if (host.endsWith(".internal")) return true;
  return false;
}

async function defaultLookup(hostname: string): Promise<string[]> {
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map((row) => row.address);
}

function parseHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError();
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError();
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError();
  }
  if (!url.hostname) {
    throw new UnsafeUrlError();
  }
  return url;
}

export async function assertPublicHttpUrl(
  raw: string,
  lookup: LookupFn = defaultLookup,
): Promise<URL> {
  const url = parseHttpUrl(raw);
  const hostname = url.hostname.replace(/\.$/, "");

  if (isBlockedHostname(hostname)) {
    throw new UnsafeUrlError();
  }

  const ipVersion = isIP(hostname);
  if (ipVersion) {
    if (isBlockedIp(hostname)) throw new UnsafeUrlError();
    return url;
  }

  let addresses: string[];
  try {
    addresses = await lookup(hostname);
  } catch {
    throw new UnsafeUrlError();
  }

  if (addresses.length === 0 || addresses.some((address) => isBlockedIp(address))) {
    throw new UnsafeUrlError();
  }

  return url;
}

export async function fetchPublicHttp(
  url: string,
  init: RequestInit = {},
  deps: SsrfDeps = {},
): Promise<Response> {
  const fetchImpl = deps.fetch ?? fetch;
  const lookup = deps.lookup ?? defaultLookup;

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(current, lookup);

    const response = await fetchImpl(current, {
      ...init,
      redirect: "manual",
      credentials: "omit",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Redirect missing Location (${response.status})`);
      }
      current = new URL(location, current).toString();
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects");
}
