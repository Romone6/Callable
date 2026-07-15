import IORedis from "ioredis";
import { env } from "@/lib/env";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

let redisClient: IORedis | null = null;

function getRedisClient() {
  if (env.EXECUTION_QUEUE_ENABLED !== "true") return null;
  if (!redisClient) {
    redisClient = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
  }
  return redisClient;
}

function requestIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function enforceRateLimit(
  request: Request,
  keyPrefix: string,
  perMinute = env.API_RATE_LIMIT_PER_MINUTE,
): Promise<RateLimitResult> {
  const windowSeconds = 60;
  const identity = requestIdentity(request);
  const key = `ratelimit:${keyPrefix}:${identity}`;
  const now = Date.now();
  const redis = getRedisClient();

  if (redis) {
    try {
      const value = await redis.incr(key);
      if (value === 1) {
        await redis.expire(key, windowSeconds);
      }
      const ttl = await redis.ttl(key);
      return {
        allowed: value <= perMinute,
        limit: perMinute,
        remaining: Math.max(0, perMinute - value),
        resetSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    } catch {
      // Fall through to in-memory fallback.
    }
  }

  const current = memoryCounters.get(key);
  if (!current || current.resetAt <= now) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return {
      allowed: true,
      limit: perMinute,
      remaining: perMinute - 1,
      resetSeconds: windowSeconds,
    };
  }

  current.count += 1;
  const remainingMs = Math.max(0, current.resetAt - now);
  return {
    allowed: current.count <= perMinute,
    limit: perMinute,
    remaining: Math.max(0, perMinute - current.count),
    resetSeconds: Math.ceil(remainingMs / 1000),
  };
}
