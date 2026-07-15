import IORedis from "ioredis";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { WORKER_HEARTBEAT_KEY } from "@/lib/execution-queue";
import { DRIFT_WORKER_HEARTBEAT_KEY } from "@/lib/drift-queue";

type CheckState = "ok" | "error" | "unavailable";

type ReadinessCheck = {
  status: CheckState;
  detail: string;
};

export type ReadinessReport = {
  status: "ok" | "degraded";
  service: "verblayer";
  timestamp: string;
  checks: {
    database: ReadinessCheck;
    redis: ReadinessCheck;
    worker: ReadinessCheck;
    driftWorker: ReadinessCheck;
    auth: ReadinessCheck;
    providers: ReadinessCheck;
  };
};

async function checkDatabase(): Promise<ReadinessCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", detail: "database reachable" };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkRedis(): Promise<ReadinessCheck> {
  if (env.EXECUTION_QUEUE_ENABLED !== "true") {
    return { status: "unavailable", detail: "queue execution disabled by configuration" };
  }

  const redis = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  try {
    const pong = await redis.ping();
    return {
      status: pong === "PONG" ? "ok" : "error",
      detail: pong === "PONG" ? "redis reachable" : `unexpected ping response: ${pong}`,
    };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

function checkAuthMode(): ReadinessCheck {
  if (env.AUTH_MODE === "clerk") {
    return { status: "ok", detail: "clerk auth mode enabled" };
  }
  if (env.ALLOW_DEV_AUTH_MODE === "true") {
    return { status: "unavailable", detail: "development auth mode enabled" };
  }
  return { status: "error", detail: "auth mode not production-safe" };
}

function checkProviderConfig(): ReadinessCheck {
  if (env.DISCOVERY_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
    return { status: "error", detail: "DISCOVERY_PROVIDER=openai but OPENAI_API_KEY is missing" };
  }
  if (env.DISCOVERY_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
    return { status: "error", detail: "DISCOVERY_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing" };
  }
  if (env.DISCOVERY_PROVIDER === "openrouter" && !env.OPENROUTER_API_KEY) {
    return { status: "error", detail: "DISCOVERY_PROVIDER=openrouter but OPENROUTER_API_KEY is missing" };
  }
  return { status: "ok", detail: `provider '${env.DISCOVERY_PROVIDER}' configured` };
}

async function checkWorker(): Promise<ReadinessCheck> {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    return { status: "unavailable", detail: "queue worker disabled by configuration" };
  }

  if (env.EXECUTION_QUEUE_MODE === "inline") {
    return { status: "ok", detail: "inline queue worker mode enabled" };
  }

  const redis = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  try {
    const heartbeat = await redis.get(WORKER_HEARTBEAT_KEY);
    if (!heartbeat) {
      return { status: "error", detail: "worker heartbeat missing" };
    }
    return { status: "ok", detail: `worker heartbeat at ${heartbeat}` };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

async function checkDriftWorker(): Promise<ReadinessCheck> {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    return { status: "unavailable", detail: "drift worker disabled by configuration" };
  }

  if (env.EXECUTION_QUEUE_MODE === "inline") {
    return { status: "ok", detail: "inline drift worker mode enabled" };
  }

  const redis = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  try {
    const heartbeat = await redis.get(DRIFT_WORKER_HEARTBEAT_KEY);
    if (!heartbeat) {
      return { status: "error", detail: "drift worker heartbeat missing" };
    }
    return { status: "ok", detail: `drift worker heartbeat at ${heartbeat}` };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [database, redis, worker, driftWorker] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkWorker(),
    checkDriftWorker(),
  ]);
  const auth = checkAuthMode();
  const providers = checkProviderConfig();

  const hasError =
    database.status === "error" ||
    redis.status === "error" ||
    worker.status === "error" ||
    driftWorker.status === "error" ||
    auth.status === "error" ||
    providers.status === "error";

  return {
    status: hasError ? "degraded" : "ok",
    service: "verblayer",
    timestamp: new Date().toISOString(),
    checks: {
      database,
      redis,
      worker,
      driftWorker,
      auth,
      providers,
    },
  };
}
