/**
 * SSRF prevention — block webhook/fetch requests to private networks.
 * Includes DNS resolution check to prevent DNS rebinding attacks.
 */

import dns from "dns/promises";

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/,
  /^\[fe80:/i,
  /^\[fc00:/i,
  /^\[fd/i,
];

function isPrivateIp(ip: string): boolean {
  for (const pattern of PRIVATE_HOSTNAME_PATTERNS) {
    if (pattern.test(ip)) return true;
  }
  // IPv6 loopback
  if (ip === "::1" || ip === "::") return true;
  return false;
}

/** Synchronous hostname check (no DNS resolution) */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    for (const pattern of PRIVATE_HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) return true;
    }

    // Block non-http(s) schemes
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;

    return false;
  } catch {
    // Invalid URL — treat as private
    return true;
  }
}

/**
 * Async SSRF check with DNS resolution — prevents DNS rebinding attacks
 * where a public hostname resolves to a private IP address.
 */
export async function isPrivateUrlStrict(urlString: string): Promise<boolean> {
  // First run the basic check
  if (isPrivateUrl(urlString)) return true;

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace(/^\[|\]$/g, ""); // Strip IPv6 brackets

    // If hostname is already an IP, check it directly
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return isPrivateIp(hostname);
    }

    // Resolve DNS and check all resolved IPs
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const allAddresses = [...addresses, ...addresses6];

    // If DNS doesn't resolve at all, block it
    if (allAddresses.length === 0) return true;

    for (const ip of allAddresses) {
      if (isPrivateIp(ip)) return true;
    }

    return false;
  } catch {
    return true;
  }
}
