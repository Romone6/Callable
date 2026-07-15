import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  commandExecutionFindMany: vi.fn(),
  driftCheckFindMany: vi.fn(),
  approvalCount: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    commandExecution: {
      findMany: dbMocks.commandExecutionFindMany,
    },
    driftCheck: {
      findMany: dbMocks.driftCheckFindMany,
    },
    approval: {
      count: dbMocks.approvalCount,
    },
  },
}));

import { getSloSummary } from "@/lib/ops-slo";

describe("getSloSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes execution, drift, and approval metrics for lookback window", async () => {
    const started = new Date("2026-05-13T00:00:00.000Z");

    dbMocks.commandExecutionFindMany.mockResolvedValue([
      {
        status: "succeeded",
        startedAt: started,
        completedAt: new Date("2026-05-13T00:00:02.000Z"),
      },
      {
        status: "failed",
        startedAt: started,
        completedAt: new Date("2026-05-13T00:00:01.000Z"),
      },
      {
        status: "waiting_for_approval",
        startedAt: null,
        completedAt: null,
      },
    ]);
    dbMocks.driftCheckFindMany.mockResolvedValue([{ status: "ok" }, { status: "warning" }, { status: "broken" }]);
    dbMocks.approvalCount.mockResolvedValue(4);

    const summary = await getSloSummary("org_1", 10_000);

    expect(summary.lookback_hours).toBe(720);
    expect(summary.executions).toEqual({
      total: 3,
      succeeded: 1,
      failed: 1,
      waiting_for_approval: 1,
      success_rate_percent: 33.33,
      error_rate_percent: 33.33,
      avg_duration_seconds: 1.5,
    });
    expect(summary.drift).toEqual({
      total_checks: 3,
      warning_or_broken: 2,
      failure_rate_percent: 66.67,
    });
    expect(summary.approvals.pending_backlog).toBe(4);

    expect(dbMocks.commandExecutionFindMany).toHaveBeenCalledTimes(1);
    expect(dbMocks.commandExecutionFindMany).toHaveBeenCalledWith({
      where: {
        organisationId: "org_1",
        createdAt: {
          gte: expect.any(Date),
        },
      },
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });
    expect(dbMocks.driftCheckFindMany).toHaveBeenCalledWith({
      where: {
        organisationId: "org_1",
        createdAt: {
          gte: expect.any(Date),
        },
      },
      select: {
        status: true,
      },
    });
    expect(dbMocks.approvalCount).toHaveBeenCalledWith({
      where: {
        organisationId: "org_1",
        status: "pending",
      },
    });
  });

  it("falls back to 24 hours for invalid lookback values", async () => {
    dbMocks.commandExecutionFindMany.mockResolvedValue([]);
    dbMocks.driftCheckFindMany.mockResolvedValue([]);
    dbMocks.approvalCount.mockResolvedValue(0);

    const summary = await getSloSummary("org_1", Number.NaN);
    expect(summary.lookback_hours).toBe(24);
    expect(summary.executions.total).toBe(0);
    expect(summary.executions.success_rate_percent).toBe(0);
    expect(summary.drift.failure_rate_percent).toBe(0);
  });
});
