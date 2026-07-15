import { prisma } from "@/lib/db";

export type EffectiveRetentionPolicy = {
  audit_log_days: number;
  approval_days: number;
  execution_days: number;
};

const DEFAULT_POLICY: EffectiveRetentionPolicy = {
  audit_log_days: 90,
  approval_days: 90,
  execution_days: 90,
};

export async function getEffectiveRetentionPolicy(organisationId: string): Promise<EffectiveRetentionPolicy> {
  const policy = await prisma.retentionPolicy.findUnique({
    where: { organisationId },
  });

  if (!policy) return DEFAULT_POLICY;

  return {
    audit_log_days: policy.auditLogDays,
    approval_days: policy.approvalDays,
    execution_days: policy.executionDays,
  };
}

export function cutoffDateFromDays(days: number) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff;
}
