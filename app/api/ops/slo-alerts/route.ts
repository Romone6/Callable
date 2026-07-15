import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { getSloSummary } from "@/lib/ops-slo";
import { dispatchSloAlertWebhook, evaluateSloAlerts, resolveSloAlertThresholds } from "@/lib/ops-slo-alerts";
import { requirePermission, requireRole } from "@/lib/permissions";
import { dispatchSloAlertsSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "executions:read");
    requirePermission(user.role, "drift:read");
    requirePermission(user.role, "approvals:read");
    requireRole(user.role, ["owner", "admin", "operator", "reviewer"]);

    const url = new URL(request.url);
    const lookbackHours = Number(url.searchParams.get("lookback_hours") ?? 24);

    const thresholds = resolveSloAlertThresholds({
      min_success_rate_percent: parseOptionalNumber(url.searchParams.get("min_success_rate_percent")),
      max_error_rate_percent: parseOptionalNumber(url.searchParams.get("max_error_rate_percent")),
      max_avg_duration_seconds: parseOptionalNumber(url.searchParams.get("max_avg_duration_seconds")),
      max_drift_failure_rate_percent: parseOptionalNumber(url.searchParams.get("max_drift_failure_rate_percent")),
      max_pending_approvals: parseOptionalNumber(url.searchParams.get("max_pending_approvals")),
    });

    const summary = await getSloSummary(organisationId, lookbackHours);
    const alerts = evaluateSloAlerts(summary, thresholds);

    return ok({
      breached: alerts.length > 0,
      thresholds,
      alerts,
      summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    requirePermission(user.role, "drift:run");
    requireRole(user.role, ["owner", "admin", "operator"]);

    const body = await request.json();
    const parsed = dispatchSloAlertsSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid SLO alert dispatch payload", parsed.error.flatten());
    }

    const lookbackHours = parsed.data.lookback_hours ?? 24;
    const summary = await getSloSummary(organisationId, lookbackHours);
    const thresholds = resolveSloAlertThresholds(parsed.data.thresholds);
    const alerts = evaluateSloAlerts(summary, thresholds);

    if (alerts.length === 0) {
      return ok({
        dispatched: false,
        reason: "no_alerts",
        alerts_count: 0,
        thresholds,
        summary,
      });
    }

    if (parsed.data.dry_run) {
      return ok({
        dispatched: false,
        dry_run: true,
        alerts_count: alerts.length,
        thresholds,
        alerts,
        summary,
      });
    }

    const webhookUrl = parsed.data.webhook_url ?? process.env.SLO_ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      return badRequest("SLO alert webhook URL is required. Provide `webhook_url` or set `SLO_ALERT_WEBHOOK_URL`.");
    }

    const webhookResult = await dispatchSloAlertWebhook({
      webhookUrl,
      payload: {
        ts: new Date().toISOString(),
        organisation_id: organisationId,
        lookback_hours: lookbackHours,
        thresholds,
        alerts,
        summary,
      },
    });

    const webhookHost = new URL(webhookUrl).host;
    await writeAuditLog({
      organisationId,
      eventType: "ops_slo_alerts_dispatched",
      actorType: "user",
      actorId: userId,
      details: {
        webhook_host: webhookHost,
        alerts_count: alerts.length,
        lookback_hours: lookbackHours,
      },
    });

    return ok({
      dispatched: true,
      alerts_count: alerts.length,
      webhook_status: webhookResult.status,
      webhook_host: webhookHost,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

function parseOptionalNumber(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
