import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Login rate limiters — two axes:
 * 1. IP-based: prevents distributed brute force
 * 2. Account-based: prevents targeted attacks from multiple IPs
 *
 * Both use sliding window. 5 attempts / 15 min.
 * Usage:
 *   const { success, reset } = await ipLimiter.limit(`login:ip:${ip}`);
 *   const { success } = await accountLimiter.limit(`login:acct:${email}`);
 */

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export function getIpLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "admin:ratelimit:ip",
    analytics: false,
  });
}

export function getAccountLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "30 m"),
    prefix: "admin:ratelimit:acct",
    analytics: false,
  });
}
