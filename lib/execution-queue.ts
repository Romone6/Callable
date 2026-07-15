import { randomUUID } from "node:crypto";
import IORedis from "ioredis";
import { Queue, Worker } from "bullmq";
import { env } from "@/lib/env";
import { runCommandByName, type CommandRunResult } from "@/lib/execution";

export const EXECUTION_QUEUE_NAME = "command-execution";
export const WORKER_HEARTBEAT_KEY = "verblayer:worker:heartbeat";

type QueuePayload = Parameters<typeof runCommandByName>[0];

function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export async function runCommandThroughQueue(payload: QueuePayload): Promise<CommandRunResult> {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    return runCommandByName(payload);
  }
  const queueName = EXECUTION_QUEUE_NAME;

  const producerConnection = createRedisConnection();
  const queue = new Queue(queueName, { connection: producerConnection });

  const inlineWorker =
    env.EXECUTION_QUEUE_MODE === "inline"
      ? new Worker(queueName, async (job) => runCommandByName(job.data as QueuePayload), { connection: createRedisConnection() })
      : null;

  if (inlineWorker) {
    await inlineWorker.waitUntilReady();
  }

  try {
    const job = await queue.add("run-command", payload, {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
      jobId: payload.idempotencyKey ? `${payload.commandName}__${payload.idempotencyKey}` : randomUUID(),
    });

    const timeoutMs = 60000;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const current = await queue.getJob(job.id ?? "");
      if (!current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      const state = await current.getState();
      if (state === "completed") {
        const result = current.returnvalue as CommandRunResult;
        await current.remove().catch(() => undefined);
        return result;
      }
      if (state === "failed") {
        const reason = current.failedReason || "Queue job failed";
        await current.remove().catch(() => undefined);
        throw new Error(reason);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Queue execution timeout after ${timeoutMs}ms`);
  } finally {
    await Promise.all([
      inlineWorker?.close(),
      queue.close(),
      producerConnection.quit(),
    ]);
  }
}
