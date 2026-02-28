/**
 * In-memory sliding window rate limiter.
 * IP-keyed, auto-cleans expired entries.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(windowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Don't prevent Node from exiting
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  // Cloudflare sets this — cannot be spoofed by the client
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  // Trusted reverse proxy header
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Fallback: rightmost IP from X-Forwarded-For (added by outermost trusted proxy)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1];
  }
  return "unknown";
}

/**
 * Check rate limit for a given key. Returns null if allowed,
 * or a Response (429) if rate limited.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig
): { limited: false } | { limited: true; retryAfterSeconds: number } {
  startCleanup(config.windowMs);

  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil(
      (oldestInWindow + config.windowMs - now) / 1000
    );
    store.set(key, entry);
    return { limited: true, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { limited: false };
}
