import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/queue-observability", () => ({
  getQueueHealthReport: vi.fn(),
  getWorkerStatusReport: vi.fn(),
  replayFailedQueueJob: vi.fn(),
  acknowledgeFailedQueueJob: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { acknowledgeFailedQueueJob, getQueueHealthReport, getWorkerStatusReport, replayFailedQueueJob } from "@/lib/queue-observability";
import { GET as getQueueHealth } from "@/app/api/ops/queue-health/route";
import { GET as getWorkerStatus } from "@/app/api/ops/worker-status/route";
import { POST as replayQueueJob } from "@/app/api/ops/queue-health/replay/route";
import { POST as acknowledgeQueueJob } from "@/app/api/ops/queue-health/ack/route";

describe("ops observability routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns queue health for authorized role", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "ops@example.com",
        name: "Ops",
        role: "operator",
      },
    });

    vi.mocked(getQueueHealthReport).mockResolvedValue({
      queue_enabled: true,
      queue_mode: "worker",
      queues: [
        {
          queue: "execution",
          queue_name: "command-execution",
          counts: { waiting: 1, active: 0, completed: 10, failed: 0, delayed: 0, paused: 0, prioritized: 0 },
          failed_jobs: [],
        },
      ],
    });

    const response = await getQueueHealth(new Request("http://localhost/api/ops/queue-health?failed_limit=5"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.queue_enabled).toBe(true);
    expect(Array.isArray(body.queues)).toBe(true);
    expect(getQueueHealthReport).toHaveBeenCalledWith(5);
  });

  it("returns worker status for authorized role", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "ops@example.com",
        name: "Ops",
        role: "operator",
      },
    });

    vi.mocked(getWorkerStatusReport).mockResolvedValue({
      queue_enabled: true,
      queue_mode: "worker",
      execution_worker: { status: "ok", detail: "heartbeat fresh", timestamp: "2026-05-13T00:00:00.000Z" },
      drift_worker: { status: "ok", detail: "heartbeat fresh", timestamp: "2026-05-13T00:00:00.000Z" },
    });

    const response = await getWorkerStatus();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.execution_worker.status).toBe("ok");
  });

  it("replays failed queue job for authorized role", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "ops@example.com",
        name: "Ops",
        role: "operator",
      },
    });

    vi.mocked(replayFailedQueueJob).mockResolvedValue({
      queue: "execution",
      queue_name: "command-execution",
      job_id: "job_123",
      replayed: true,
    });

    const response = await replayQueueJob(
      new Request("http://localhost/api/ops/queue-health/replay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queue: "execution", job_id: "job_123" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.replayed).toBe(true);
  });

  it("acknowledges failed queue job for authorized role", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "ops@example.com",
        name: "Ops",
        role: "operator",
      },
    });

    vi.mocked(acknowledgeFailedQueueJob).mockResolvedValue({
      queue: "execution",
      queue_name: "command-execution",
      job_id: "job_456",
      acknowledged: true,
    });

    const response = await acknowledgeQueueJob(
      new Request("http://localhost/api/ops/queue-health/ack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queue: "execution", job_id: "job_456", note: "triaged" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.acknowledged).toBe(true);
  });

  it("blocks viewer role from queue health and worker status", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const queueRes = await getQueueHealth(new Request("http://localhost/api/ops/queue-health"));
    expect(queueRes.status).toBe(403);

    const workerRes = await getWorkerStatus();
    expect(workerRes.status).toBe(403);

    const ackRes = await acknowledgeQueueJob(
      new Request("http://localhost/api/ops/queue-health/ack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queue: "execution", job_id: "job_1" }),
      }),
    );
    expect(ackRes.status).toBe(403);
  });
});
