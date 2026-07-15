import { prisma } from "@/lib/db";
import { ok, serverError, unauthorized } from "@/lib/http";
import { requireCronAuth } from "@/lib/cron-auth";
import { runRetentionPurgeForOrganisation, type PurgeResource } from "@/lib/purge";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    await requireCronAuth(request);
    const body = await request.json().catch(() => ({}));
    const dryRun = typeof body.dry_run === "boolean" ? body.dry_run : false;
    const resource =
      body.resource === "audit_logs" || body.resource === "approvals" || body.resource === "executions" || body.resource === "all"
        ? (body.resource as PurgeResource)
        : "all";

    const organisations = await prisma.organisation.findMany({
      select: { id: true },
    });

    const summaries: Array<{ organisation_id: string; purge_counts: { audit_logs: number; approvals: number; executions: number } }> = [];

    for (const organisation of organisations) {
      const results = await runRetentionPurgeForOrganisation({
        organisationId: organisation.id,
        resource,
        dryRun,
      });

      summaries.push({
        organisation_id: organisation.id,
        purge_counts: results.purge_counts,
      });

      await writeAuditLog({
        organisationId: organisation.id,
        eventType: dryRun ? "retention_purge_cron_dry_run" : "retention_purge_cron_executed",
        actorType: "system",
        details: {
          dry_run: dryRun,
          resource,
          purge_counts: results.purge_counts,
        },
      });
    }

    return ok({ dry_run: dryRun, resource, organisations: summaries });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return unauthorized(error.message);
    }
    return serverError(error);
  }
}
