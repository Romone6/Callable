import { ExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cutoffDateFromDays, getEffectiveRetentionPolicy } from "@/lib/retention";

export type PurgeResource = "all" | "audit_logs" | "approvals" | "executions";

export async function runRetentionPurgeForOrganisation(params: {
  organisationId: string;
  resource: PurgeResource;
  dryRun: boolean;
}) {
  const policy = await getEffectiveRetentionPolicy(params.organisationId);
  const auditCutoff = cutoffDateFromDays(policy.audit_log_days);
  const approvalCutoff = cutoffDateFromDays(policy.approval_days);
  const executionCutoff = cutoffDateFromDays(policy.execution_days);

  const includeAudit = params.resource === "all" || params.resource === "audit_logs";
  const includeApprovals = params.resource === "all" || params.resource === "approvals";
  const includeExecutions = params.resource === "all" || params.resource === "executions";

  const auditCount = includeAudit
    ? await prisma.auditLog.count({ where: { organisationId: params.organisationId, createdAt: { lt: auditCutoff } } })
    : 0;
  const approvalCount = includeApprovals
    ? await prisma.approval.count({
        where: {
          organisationId: params.organisationId,
          createdAt: { lt: approvalCutoff },
          status: { in: ["approved", "rejected", "more_info"] },
        },
      })
    : 0;
  const executionCount = includeExecutions
    ? await prisma.commandExecution.count({
        where: {
          organisationId: params.organisationId,
          createdAt: { lt: executionCutoff },
          status: { in: [ExecutionStatus.succeeded, ExecutionStatus.failed, ExecutionStatus.cancelled] },
        },
      })
    : 0;

  if (!params.dryRun) {
    await prisma.$transaction(async (tx) => {
      if (includeAudit) {
        await tx.auditLog.deleteMany({ where: { organisationId: params.organisationId, createdAt: { lt: auditCutoff } } });
      }
      if (includeApprovals) {
        await tx.approval.deleteMany({
          where: {
            organisationId: params.organisationId,
            createdAt: { lt: approvalCutoff },
            status: { in: ["approved", "rejected", "more_info"] },
          },
        });
      }
      if (includeExecutions) {
        await tx.commandExecution.deleteMany({
          where: {
            organisationId: params.organisationId,
            createdAt: { lt: executionCutoff },
            status: { in: [ExecutionStatus.succeeded, ExecutionStatus.failed, ExecutionStatus.cancelled] },
          },
        });
      }
    });
  }

  return {
    retention_days: policy,
    purge_counts: {
      audit_logs: auditCount,
      approvals: approvalCount,
      executions: executionCount,
    },
  };
}
