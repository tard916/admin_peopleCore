import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Login rate limiters — two axes:
 * 1. IP-based: prevents distributed brute force
 * 2. Account-based: prevents targeted attacks from multiple IPs
 *
 * Upstash Redis is OPTIONAL — when env vars are unset (typical in local
 * dev), a no-op limiter is returned so login still works. Production MUST
 * configure UPSTASH_REDIS_REST_URL/TOKEN.
 */

type LimiterLike = {
  limit: (key: string) => Promise<{ success: boolean; reset: number }>;
};

const NOOP_LIMITER: LimiterLike = {
  limit: async () => ({ success: true, reset: Date.now() + 60_000 }),
};

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export function getIpLimiter(): LimiterLike {
  const r = getRedis();
  if (!r) return NOOP_LIMITER;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "admin:ratelimit:ip",
    analytics: false,
  });
}

export function getAccountLimiter(): LimiterLike {
  const r = getRedis();
  if (!r) return NOOP_LIMITER;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, "30 m"),
    prefix: "admin:ratelimit:acct",
    analytics: false,
  });
}
