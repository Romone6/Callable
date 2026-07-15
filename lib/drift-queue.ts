import { randomUUID } from "node:crypto";
import IORedis from "ioredis";
import { Queue, Worker } from "bullmq";
import { env } from "@/lib/env";
import { runDriftCheck } from "@/lib/drift";

export const DRIFT_QUEUE_NAME = "drift-scan";
export const DRIFT_WORKER_HEARTBEAT_KEY = "verblayer:drift-worker:heartbeat";

type DriftQueuePayload = {
  organisationId: string;
  commandId: string;
};

function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export async function enqueueDriftChecks(items: DriftQueuePayload[]) {
  if (env.EXECUTION_QUEUE_ENABLED !== "true" || env.EXECUTION_QUEUE_MODE === "off") {
    throw new Error("Queue execution is disabled; drift fan-out queue is unavailable.");
  }

  const connection = createRedisConnection();
  const queue = new Queue(DRIFT_QUEUE_NAME, { connection });
  const inlineWorker =
    env.EXECUTION_QUEUE_MODE === "inline"
      ? new Worker(
          DRIFT_QUEUE_NAME,
          async (job) => runDriftCheck((job.data as DriftQueuePayload).commandId, (job.data as DriftQueuePayload).organisationId),
          { connection: createRedisConnection() },
        )
      : null;

  if (inlineWorker) {
    await inlineWorker.waitUntilReady();
  }

  try {
    await queue.addBulk(
      items.map((item) => ({
        name: "drift-check",
        data: item,
        opts: {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
          jobId: `${item.commandId}__${randomUUID().slice(0, 8)}`,
        },
      })),
    );
  } finally {
    await Promise.all([inlineWorker?.close(), queue.close(), connection.quit()]);
  }
}
