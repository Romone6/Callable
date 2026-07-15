import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

vi.mock("@/lib/ops-slo", () => ({
  getSloSummary: vi.fn(),
}));

vi.mock("@/lib/ops-slo-alerts", () => ({
  resolveSloAlertThresholds: vi.fn(),
  evaluateSloAlerts: vi.fn(),
  dispatchSloAlertWebhook: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getSloSummary } from "@/lib/ops-slo";
import { dispatchSloAlertWebhook, evaluateSloAlerts, resolveSloAlertThresholds } from "@/lib/ops-slo-alerts";
import { GET as getSloAlerts, POST as postSloAlerts } from "@/app/api/ops/slo-alerts/route";

describe("ops slo alerts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns evaluated alerts for authorized reviewer", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "reviewer@example.com",
        name: "Reviewer",
        role: "reviewer",
      },
    });
    vi.mocked(resolveSloAlertThresholds).mockReturnValue({
      min_success_rate_percent: 99,
      max_error_rate_percent: 1,
      max_avg_duration_seconds: 10,
      max_drift_failure_rate_percent: 5,
      max_pending_approvals: 25,
    });
    vi.mocked(getSloSummary).mockResolvedValue({
      lookback_hours: 24,
      window_start: "2026-05-14T00:00:00.000Z",
      executions: {
        total: 10,
        succeeded: 9,
        failed: 1,
        waiting_for_approval: 0,
        success_rate_percent: 90,
        error_rate_percent: 10,
        avg_duration_seconds: 1,
      },
      drift: {
        total_checks: 2,
        warning_or_broken: 0,
        failure_rate_percent: 0,
      },
      approvals: {
        pending_backlog: 0,
      },
    });
    vi.mocked(evaluateSloAlerts).mockReturnValue([
      {
        code: "execution_success_rate_low",
        severity: "critical",
        metric: "executions.success_rate_percent",
        current: 90,
        threshold: 99,
        comparator: "<",
        message: "low",
      },
    ]);

    const response = await getSloAlerts(new Request("http://localhost/api/ops/slo-alerts?lookback_hours=24"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.breached).toBe(true);
    expect(Array.isArray(body.alerts)).toBe(true);
  });

  it("blocks viewer role for GET", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_2",
      user: {
        id: "user_2",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const response = await getSloAlerts(new Request("http://localhost/api/ops/slo-alerts"));
    expect(response.status).toBe(403);
  });

  it("returns dry-run payload without dispatching webhook", async () => {
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
    vi.mocked(resolveSloAlertThresholds).mockReturnValue({
      min_success_rate_percent: 99,
      max_error_rate_percent: 1,
      max_avg_duration_seconds: 10,
      max_drift_failure_rate_percent: 5,
      max_pending_approvals: 25,
    });
    vi.mocked(getSloSummary).mockResolvedValue({
      lookback_hours: 24,
      window_start: "2026-05-14T00:00:00.000Z",
      executions: {
        total: 10,
        succeeded: 9,
        failed: 1,
        waiting_for_approval: 0,
        success_rate_percent: 90,
        error_rate_percent: 10,
        avg_duration_seconds: 1,
      },
      drift: {
        total_checks: 2,
        warning_or_broken: 0,
        failure_rate_percent: 0,
      },
      approvals: {
        pending_backlog: 0,
      },
    });
    vi.mocked(evaluateSloAlerts).mockReturnValue([
      {
        code: "execution_success_rate_low",
        severity: "critical",
        metric: "executions.success_rate_percent",
        current: 90,
        threshold: 99,
        comparator: "<",
        message: "low",
      },
    ]);

    const response = await postSloAlerts(
      new Request("http://localhost/api/ops/slo-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dry_run: true }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dispatched).toBe(false);
    expect(body.dry_run).toBe(true);
    expect(dispatchSloAlertWebhook).not.toHaveBeenCalled();
  });

  it("dispatches webhook and writes audit log for operator", async () => {
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
    vi.mocked(resolveSloAlertThresholds).mockReturnValue({
      min_success_rate_percent: 99,
      max_error_rate_percent: 1,
      max_avg_duration_seconds: 10,
      max_drift_failure_rate_percent: 5,
      max_pending_approvals: 25,
    });
    vi.mocked(getSloSummary).mockResolvedValue({
      lookback_hours: 24,
      window_start: "2026-05-14T00:00:00.000Z",
      executions: {
        total: 10,
        succeeded: 9,
        failed: 1,
        waiting_for_approval: 0,
        success_rate_percent: 90,
        error_rate_percent: 10,
        avg_duration_seconds: 1,
      },
      drift: {
        total_checks: 2,
        warning_or_broken: 0,
        failure_rate_percent: 0,
      },
      approvals: {
        pending_backlog: 0,
      },
    });
    vi.mocked(evaluateSloAlerts).mockReturnValue([
      {
        code: "execution_success_rate_low",
        severity: "critical",
        metric: "executions.success_rate_percent",
        current: 90,
        threshold: 99,
        comparator: "<",
        message: "low",
      },
    ]);
    vi.mocked(dispatchSloAlertWebhook).mockResolvedValue({ status: 200 });

    const response = await postSloAlerts(
      new Request("http://localhost/api/ops/slo-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ webhook_url: "https://alerts.example.com/hooks" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dispatched).toBe(true);
    expect(body.alerts_count).toBe(1);
    expect(dispatchSloAlertWebhook).toHaveBeenCalledTimes(1);
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
  });
});
