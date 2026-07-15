import { prisma } from "@/lib/db";

export async function getSloSummary(organisationId: string, lookbackHours = 24) {
  const hours = Number.isFinite(lookbackHours) && lookbackHours > 0 ? Math.min(Math.floor(lookbackHours), 24 * 30) : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [executions, drifts, approvalBacklog] = await Promise.all([
    prisma.commandExecution.findMany({
      where: {
        organisationId,
        createdAt: { gte: since },
      },
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    prisma.driftCheck.findMany({
      where: {
        organisationId,
        createdAt: { gte: since },
      },
      select: { status: true },
    }),
    prisma.approval.count({
      where: {
        organisationId,
        status: "pending",
      },
    }),
  ]);

  const totalExecutions = executions.length;
  const succeeded = executions.filter((item) => item.status === "succeeded").length;
  const failed = executions.filter((item) => item.status === "failed").length;
  const waitingForApproval = executions.filter((item) => item.status === "waiting_for_approval").length;
  const successRate = totalExecutions > 0 ? Number(((succeeded / totalExecutions) * 100).toFixed(2)) : 0;
  const errorRate = totalExecutions > 0 ? Number(((failed / totalExecutions) * 100).toFixed(2)) : 0;

  const durations = executions
    .filter((item) => item.startedAt && item.completedAt)
    .map((item) => (item.completedAt!.getTime() - item.startedAt!.getTime()) / 1000);
  const avgDurationSeconds =
    durations.length > 0 ? Number((durations.reduce((acc, value) => acc + value, 0) / durations.length).toFixed(2)) : 0;

  const totalDriftChecks = drifts.length;
  const brokenOrWarning = drifts.filter((item) => item.status === "broken" || item.status === "warning").length;
  const driftFailureRate = totalDriftChecks > 0 ? Number(((brokenOrWarning / totalDriftChecks) * 100).toFixed(2)) : 0;

  return {
    lookback_hours: hours,
    window_start: since.toISOString(),
    executions: {
      total: totalExecutions,
      succeeded,
      failed,
      waiting_for_approval: waitingForApproval,
      success_rate_percent: successRate,
      error_rate_percent: errorRate,
      avg_duration_seconds: avgDurationSeconds,
    },
    drift: {
      total_checks: totalDriftChecks,
      warning_or_broken: brokenOrWarning,
      failure_rate_percent: driftFailureRate,
    },
    approvals: {
      pending_backlog: approvalBacklog,
    },
  };
}
