/**
 * SSRF prevention — block webhook/fetch requests to private networks.
 */

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
