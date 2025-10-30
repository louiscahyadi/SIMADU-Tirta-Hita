import { NextResponse, type NextRequest } from "next/server";

import { RATE_LIMITS } from "./constants";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Rate limiter interface
 */
interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<boolean>;
}

/**
 * In-memory rate limiter (fallback, not recommended for production)
 */
class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, number[]>();

  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.store.get(key) || [];
    const recentTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (recentTimestamps.length >= limit) {
      return false; // Rate limit exceeded
    }

    recentTimestamps.push(now);
    this.store.set(key, recentTimestamps);

    // Cleanup old entries
    if (this.store.size > 10000) {
      const oldestKey = Array.from(this.store.keys())[0];
      if (oldestKey) this.store.delete(oldestKey);
    }

    return true; // Allowed
  }
}

/**
 * Redis-based rate limiter (recommended for production)
 */
class RedisRateLimiter implements RateLimiter {
  private redis: any; // Upstash Redis client

  constructor() {
    // Lazy import to avoid errors if Redis is not configured
    try {
      const { Redis } = require("@upstash/redis");
      this.redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } catch (err) {
      logger.warn("Redis not available, falling back to memory rate limiter", { error: err });
      throw err;
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set to store timestamps
      const multi = this.redis.multi();

      // Remove old entries
      multi.zremrangebyscore(key, 0, windowStart);

      // Count current entries
      multi.zcard(key);

      // Add current timestamp
      multi.zadd(key, { score: now, member: now });

      // Set expiry
      multi.expire(key, Math.ceil(windowMs / 1000) + 1);

      const results = await multi.exec();
      const count = results[1] as number;

      return count < limit;
    } catch (err) {
      logger.error(
        err instanceof Error ? err : new Error(String(err)),
        "Redis rate limit check failed",
      );
      // Fail open (allow request) if Redis is down
      return true;
    }
  }
}

/**
 * Get rate limiter instance (Redis if available, otherwise memory)
 */
function getRateLimiter(): RateLimiter {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return new RedisRateLimiter();
    } catch {
      logger.warn("Redis not available, using in-memory rate limiter");
    }
  }
  return new MemoryRateLimiter();
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

function getRateLimiterInstance(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = getRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Apply rate limiting to a request
 * @param req - Next.js request
 * @param options - Rate limit options
 * @returns NextResponse if rate limited, null if allowed
 */
export async function applyRateLimit(
  req: NextRequest,
  options: {
    limit: number;
    windowMs: number;
    message?: string;
  },
): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const key = `ratelimit:${ip}:${req.nextUrl.pathname}`;
  const limiter = getRateLimiterInstance();

  const allowed = await limiter.check(key, options.limit, options.windowMs);

  if (!allowed) {
    return new NextResponse(options.message || "Too many requests. Please try again later.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(options.windowMs / 1000)),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  return null; // Request allowed
}

/**
 * Middleware rate limiting helper
 */
export async function checkRateLimit(
  req: NextRequest,
  type: "api" | "public_complaint" = "api",
): Promise<NextResponse | null> {
  const config = type === "public_complaint" ? RATE_LIMITS.PUBLIC_COMPLAINT : RATE_LIMITS.API;

  return applyRateLimit(req, {
    limit: config.REQUESTS,
    windowMs: config.WINDOW_MS,
    message:
      type === "public_complaint"
        ? "Terlalu banyak pengaduan. Silakan coba lagi dalam 5 menit."
        : "Too many requests. Please try again in 1 minute.",
  });
}
