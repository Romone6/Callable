import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission, requireRole } from "@/lib/permissions";
import { runPurgeSchema } from "@/lib/schemas";
import { runRetentionPurgeForOrganisation } from "@/lib/purge";

export async function POST(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    requireRole(user.role, ["owner", "admin"]);

    const parsed = runPurgeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid purge payload", parsed.error.flatten());
    }

    const results = await runRetentionPurgeForOrganisation({
      organisationId,
      resource: parsed.data.resource,
      dryRun: parsed.data.dry_run,
    });

    await writeAuditLog({
      organisationId,
      eventType: parsed.data.dry_run ? "retention_purge_dry_run" : "retention_purge_executed",
      actorType: "user",
      actorId: userId,
      details: {
        resource: parsed.data.resource,
        dry_run: parsed.data.dry_run,
        retention_days: results.retention_days,
        purge_counts: results.purge_counts,
      },
    });

    return ok({
      dry_run: parsed.data.dry_run,
      resource: parsed.data.resource,
      retention_days: results.retention_days,
      purge_counts: results.purge_counts,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
