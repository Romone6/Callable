import IORedis from "ioredis";
import { Queue } from "bullmq";
import { env } from "@/lib/env";
import { EXECUTION_QUEUE_NAME, WORKER_HEARTBEAT_KEY } from "@/lib/execution-queue";
import { DRIFT_QUEUE_NAME, DRIFT_WORKER_HEARTBEAT_KEY } from "@/lib/drift-queue";

type QueueName = "execution" | "drift";

type QueueFailedJob = {
  id: string;
  name: string;
  failed_reason: string | null;
  attempts_made: number;
  timestamp: number;
  processed_on: number | null;
  finished_on: number | null;
};

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  prioritized: number;
};

type QueueReport = {
  queue: QueueName;
  queue_name: string;
  counts: QueueCounts;
  failed_jobs: QueueFailedJob[];
};

function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
}

function parseHeartbeatStatus(heartbeat: string | null) {
  if (!heartbeat) {
    return { status: "error" as const, detail: "heartbeat missing", timestamp: null };
  }
  const time = new Date(heartbeat).getTime();
  if (Number.isNaN(time)) {
    return { status: "error" as const, detail: "heartbeat malformed", timestamp: heartbeat };
  }
  const ageMs = Date.now() - time;
  if (ageMs > 45_000) {
    return { status: "warning" as const, detail: `stale heartbeat (${Math.round(ageMs / 1000)}s)`, timestamp: heartbeat };
  }
  return { status: "ok" as const, detail: "heartbeat fresh", timestamp: heartbeat };
}

export async function getWorkerStatusReport() {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    return {
      queue_enabled: false,
      queue_mode: env.EXECUTION_QUEUE_MODE,
      execution_worker: { status: "unavailable", detail: "queue worker disabled", timestamp: null },
      drift_worker: { status: "unavailable", detail: "drift worker disabled", timestamp: null },
    };
  }

  if (env.EXECUTION_QUEUE_MODE === "inline") {
    return {
      queue_enabled: true,
      queue_mode: env.EXECUTION_QUEUE_MODE,
      execution_worker: { status: "ok", detail: "inline mode active", timestamp: null },
      drift_worker: { status: "ok", detail: "inline mode active", timestamp: null },
    };
  }

  const redis = createRedisConnection();
  try {
    const [executionHeartbeat, driftHeartbeat] = await Promise.all([
      redis.get(WORKER_HEARTBEAT_KEY),
      redis.get(DRIFT_WORKER_HEARTBEAT_KEY),
    ]);
    return {
      queue_enabled: true,
      queue_mode: env.EXECUTION_QUEUE_MODE,
      execution_worker: parseHeartbeatStatus(executionHeartbeat),
      drift_worker: parseHeartbeatStatus(driftHeartbeat),
    };
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

export async function getQueueHealthReport(limitFailedJobs: number) {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    return {
      queue_enabled: false,
      queue_mode: env.EXECUTION_QUEUE_MODE,
      queues: [] as QueueReport[],
    };
  }

  const bounded = Number.isFinite(limitFailedJobs) && limitFailedJobs > 0 ? Math.min(Math.floor(limitFailedJobs), 50) : 10;
  const redis = createRedisConnection();
  const executionQueue = new Queue(EXECUTION_QUEUE_NAME, { connection: redis });
  const driftQueue = new Queue(DRIFT_QUEUE_NAME, { connection: redis });

  async function queueSnapshot(queue: Queue, name: QueueName): Promise<QueueReport> {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused", "prioritized");
    const failedJobs = await queue.getJobs(["failed"], 0, bounded - 1, false);
    return {
      queue: name,
      queue_name: queue.name,
      counts: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
        paused: counts.paused ?? 0,
        prioritized: counts.prioritized ?? 0,
      },
      failed_jobs: failedJobs.map((job) => ({
        id: String(job.id ?? ""),
        name: job.name,
        failed_reason: job.failedReason ?? null,
        attempts_made: job.attemptsMade,
        timestamp: job.timestamp,
        processed_on: job.processedOn ?? null,
        finished_on: job.finishedOn ?? null,
      })),
    };
  }

  try {
    const [execution, drift] = await Promise.all([queueSnapshot(executionQueue, "execution"), queueSnapshot(driftQueue, "drift")]);
    return {
      queue_enabled: true,
      queue_mode: env.EXECUTION_QUEUE_MODE,
      queues: [execution, drift],
    };
  } finally {
    await Promise.all([executionQueue.close(), driftQueue.close(), redis.quit().catch(() => undefined)]);
  }
}

export async function replayFailedQueueJob(params: { queue: QueueName; jobId: string }) {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    throw new Error("Queue execution is disabled.");
  }

  const queueName = params.queue === "execution" ? EXECUTION_QUEUE_NAME : DRIFT_QUEUE_NAME;
  const redis = createRedisConnection();
  const queue = new Queue(queueName, { connection: redis });

  try {
    const job = await queue.getJob(params.jobId);
    if (!job) {
      throw new Error(`Not found: failed job '${params.jobId}' does not exist in queue '${params.queue}'`);
    }
    const state = await job.getState();
    if (state !== "failed") {
      throw new Error(`Invalid state: only failed jobs can be replayed (current state: ${state})`);
    }
    await job.retry();
    return {
      queue: params.queue,
      queue_name: queueName,
      job_id: String(job.id ?? params.jobId),
      replayed: true,
    };
  } finally {
    await Promise.all([queue.close(), redis.quit().catch(() => undefined)]);
  }
}

export async function acknowledgeFailedQueueJob(params: { queue: QueueName; jobId: string }) {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    throw new Error("Queue execution is disabled.");
  }

  const queueName = params.queue === "execution" ? EXECUTION_QUEUE_NAME : DRIFT_QUEUE_NAME;
  const redis = createRedisConnection();
  const queue = new Queue(queueName, { connection: redis });

  try {
    const job = await queue.getJob(params.jobId);
    if (!job) {
      throw new Error(`Not found: failed job '${params.jobId}' does not exist in queue '${params.queue}'`);
    }
    const state = await job.getState();
    if (state !== "failed") {
      throw new Error(`Invalid state: only failed jobs can be acknowledged (current state: ${state})`);
    }
    await job.remove();
    return {
      queue: params.queue,
      queue_name: queueName,
      job_id: String(job.id ?? params.jobId),
      acknowledged: true,
    };
  } finally {
    await Promise.all([queue.close(), redis.quit().catch(() => undefined)]);
  }
}
