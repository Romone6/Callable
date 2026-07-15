import IORedis from "ioredis";
import { Worker } from "bullmq";
import { env } from "@/lib/env";
import { runCommandByName } from "@/lib/execution";
import { EXECUTION_QUEUE_NAME, WORKER_HEARTBEAT_KEY } from "@/lib/execution-queue";
import { DRIFT_QUEUE_NAME, DRIFT_WORKER_HEARTBEAT_KEY } from "@/lib/drift-queue";
import { runDriftCheck } from "@/lib/drift";

function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export async function startExecutionWorker() {
  const executionConnection = createRedisConnection();
  const driftConnection = createRedisConnection();
  const heartbeatConnection = createRedisConnection();

  const executionWorker = new Worker(
    EXECUTION_QUEUE_NAME,
    async (job) => runCommandByName(job.data as Parameters<typeof runCommandByName>[0]),
    {
      connection: executionConnection,
      concurrency: 5,
      lockDuration: 60_000,
    },
  );

  const driftWorker = new Worker(
    DRIFT_QUEUE_NAME,
    async (job) => {
      const payload = job.data as { commandId: string; organisationId: string };
      return runDriftCheck(payload.commandId, payload.organisationId);
    },
    {
      connection: driftConnection,
      concurrency: 3,
      lockDuration: 60_000,
    },
  );

  const heartbeatTimer = setInterval(async () => {
    try {
      const now = new Date().toISOString();
      await heartbeatConnection.set(WORKER_HEARTBEAT_KEY, now, "EX", 30);
      await heartbeatConnection.set(DRIFT_WORKER_HEARTBEAT_KEY, now, "EX", 30);
    } catch {
      // Best effort heartbeat only.
    }
  }, 10_000);

  await Promise.all([executionWorker.waitUntilReady(), driftWorker.waitUntilReady()]);

  return {
    executionWorker,
    driftWorker,
    close: async () => {
      clearInterval(heartbeatTimer);
      await Promise.all([
        executionWorker.close(),
        driftWorker.close(),
        executionConnection.quit(),
        driftConnection.quit(),
        heartbeatConnection.quit(),
      ]);
    },
  };
}
