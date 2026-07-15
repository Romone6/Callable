import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SLO_ALERT_THRESHOLDS,
  dispatchSloAlertWebhook,
  evaluateSloAlerts,
  resolveSloAlertThresholds,
} from "@/lib/ops-slo-alerts";

describe("ops slo alerts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("evaluates threshold breaches from SLO summary", () => {
    const alerts = evaluateSloAlerts(
      {
        lookback_hours: 24,
        window_start: "2026-05-14T00:00:00.000Z",
        executions: {
          total: 100,
          succeeded: 90,
          failed: 10,
          waiting_for_approval: 0,
          success_rate_percent: 90,
          error_rate_percent: 10,
          avg_duration_seconds: 12,
        },
        drift: {
          total_checks: 50,
          warning_or_broken: 6,
          failure_rate_percent: 12,
        },
        approvals: {
          pending_backlog: 30,
        },
      },
      DEFAULT_SLO_ALERT_THRESHOLDS,
    );

    expect(alerts.map((item) => item.code)).toEqual([
      "execution_success_rate_low",
      "execution_error_rate_high",
      "execution_latency_high",
      "drift_failure_rate_high",
      "approval_backlog_high",
    ]);
  });

  it("merges threshold overrides", () => {
    const merged = resolveSloAlertThresholds({ max_pending_approvals: 5 });
    expect(merged.max_pending_approvals).toBe(5);
    expect(merged.min_success_rate_percent).toBe(DEFAULT_SLO_ALERT_THRESHOLDS.min_success_rate_percent);
  });

  it("dispatches webhook payload and fails on non-2xx responses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 202 }))
      .mockResolvedValueOnce(new Response("bad", { status: 500 }));

    const okResult = await dispatchSloAlertWebhook({
      webhookUrl: "https://alerts.example.com/",
      payload: { a: 1 },
    });
    expect(okResult.status).toBe(202);

    await expect(
      dispatchSloAlertWebhook({
        webhookUrl: "https://alerts.example.com/",
        payload: { a: 2 },
      }),
    ).rejects.toThrow(/Webhook dispatch failed/);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://alerts.example.com",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
