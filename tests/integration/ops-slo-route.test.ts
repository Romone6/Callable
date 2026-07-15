import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

vi.mock("@/lib/ops-slo", () => ({
  getSloSummary: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { getSloSummary } from "@/lib/ops-slo";
import { GET as getSloSummaryRoute } from "@/app/api/ops/slo-summary/route";

describe("ops slo summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SLO summary for authorized operator", async () => {
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

    vi.mocked(getSloSummary).mockResolvedValue({
      lookback_hours: 12,
      window_start: "2026-05-13T00:00:00.000Z",
      executions: {
        total: 10,
        succeeded: 8,
        failed: 2,
        waiting_for_approval: 0,
        success_rate_percent: 80,
        error_rate_percent: 20,
        avg_duration_seconds: 2.1,
      },
      drift: {
        total_checks: 5,
        warning_or_broken: 1,
        failure_rate_percent: 20,
      },
      approvals: {
        pending_backlog: 3,
      },
    });

    const response = await getSloSummaryRoute(new Request("http://localhost/api/ops/slo-summary?lookback_hours=12"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.lookback_hours).toBe(12);
    expect(getSloSummary).toHaveBeenCalledWith("org_1", 12);
  });

  it("allows reviewer role for read-only SLO summary access", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_2",
      user: {
        id: "user_2",
        email: "reviewer@example.com",
        name: "Reviewer",
        role: "reviewer",
      },
    });

    vi.mocked(getSloSummary).mockResolvedValue({
      lookback_hours: 24,
      window_start: "2026-05-12T00:00:00.000Z",
      executions: {
        total: 0,
        succeeded: 0,
        failed: 0,
        waiting_for_approval: 0,
        success_rate_percent: 0,
        error_rate_percent: 0,
        avg_duration_seconds: 0,
      },
      drift: {
        total_checks: 0,
        warning_or_broken: 0,
        failure_rate_percent: 0,
      },
      approvals: {
        pending_backlog: 0,
      },
    });

    const response = await getSloSummaryRoute(new Request("http://localhost/api/ops/slo-summary"));
    expect(response.status).toBe(200);
  });

  it("blocks viewer role from SLO summary", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_3",
      user: {
        id: "user_3",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const response = await getSloSummaryRoute(new Request("http://localhost/api/ops/slo-summary"));
    expect(response.status).toBe(403);
  });
});
