import { getSloSummary } from "@/lib/ops-slo";

export type SloAlertThresholds = {
  min_success_rate_percent: number;
  max_error_rate_percent: number;
  max_avg_duration_seconds: number;
  max_drift_failure_rate_percent: number;
  max_pending_approvals: number;
};

export type SloAlert = {
  code:
    | "execution_success_rate_low"
    | "execution_error_rate_high"
    | "execution_latency_high"
    | "drift_failure_rate_high"
    | "approval_backlog_high";
  severity: "warning" | "critical";
  metric: string;
  current: number;
  threshold: number;
  comparator: "<" | ">";
  message: string;
};

export const DEFAULT_SLO_ALERT_THRESHOLDS: SloAlertThresholds = {
  min_success_rate_percent: 99,
  max_error_rate_percent: 1,
  max_avg_duration_seconds: 10,
  max_drift_failure_rate_percent: 5,
  max_pending_approvals: 25,
};

export function resolveSloAlertThresholds(
  overrides?: Partial<SloAlertThresholds>,
): SloAlertThresholds {
  return {
    ...DEFAULT_SLO_ALERT_THRESHOLDS,
    ...(overrides ?? {}),
  };
}

export function evaluateSloAlerts(
  summary: Awaited<ReturnType<typeof getSloSummary>>,
  thresholds: SloAlertThresholds,
): SloAlert[] {
  const alerts: SloAlert[] = [];

  if (summary.executions.success_rate_percent < thresholds.min_success_rate_percent) {
    alerts.push({
      code: "execution_success_rate_low",
      severity: "critical",
      metric: "executions.success_rate_percent",
      current: summary.executions.success_rate_percent,
      threshold: thresholds.min_success_rate_percent,
      comparator: "<",
      message: `Execution success rate ${summary.executions.success_rate_percent}% is below minimum ${thresholds.min_success_rate_percent}%`,
    });
  }

  if (summary.executions.error_rate_percent > thresholds.max_error_rate_percent) {
    alerts.push({
      code: "execution_error_rate_high",
      severity: "critical",
      metric: "executions.error_rate_percent",
      current: summary.executions.error_rate_percent,
      threshold: thresholds.max_error_rate_percent,
      comparator: ">",
      message: `Execution error rate ${summary.executions.error_rate_percent}% exceeds maximum ${thresholds.max_error_rate_percent}%`,
    });
  }

  if (summary.executions.avg_duration_seconds > thresholds.max_avg_duration_seconds) {
    alerts.push({
      code: "execution_latency_high",
      severity: "warning",
      metric: "executions.avg_duration_seconds",
      current: summary.executions.avg_duration_seconds,
      threshold: thresholds.max_avg_duration_seconds,
      comparator: ">",
      message: `Average execution duration ${summary.executions.avg_duration_seconds}s exceeds maximum ${thresholds.max_avg_duration_seconds}s`,
    });
  }

  if (summary.drift.failure_rate_percent > thresholds.max_drift_failure_rate_percent) {
    alerts.push({
      code: "drift_failure_rate_high",
      severity: "warning",
      metric: "drift.failure_rate_percent",
      current: summary.drift.failure_rate_percent,
      threshold: thresholds.max_drift_failure_rate_percent,
      comparator: ">",
      message: `Drift failure rate ${summary.drift.failure_rate_percent}% exceeds maximum ${thresholds.max_drift_failure_rate_percent}%`,
    });
  }

  if (summary.approvals.pending_backlog > thresholds.max_pending_approvals) {
    alerts.push({
      code: "approval_backlog_high",
      severity: "warning",
      metric: "approvals.pending_backlog",
      current: summary.approvals.pending_backlog,
      threshold: thresholds.max_pending_approvals,
      comparator: ">",
      message: `Pending approvals ${summary.approvals.pending_backlog} exceeds maximum ${thresholds.max_pending_approvals}`,
    });
  }

  return alerts;
}

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export async function dispatchSloAlertWebhook(params: {
  webhookUrl: string;
  payload: Record<string, unknown>;
}) {
  const response = await fetch(stripTrailingSlash(params.webhookUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(params.payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook dispatch failed (${response.status}): ${body || "empty response"}`);
  }

  return {
    status: response.status,
  };
}
