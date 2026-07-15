import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { replayQueueJobSchema } from "@/lib/schemas";
import { replayFailedQueueJob } from "@/lib/queue-observability";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { user, userId, organisationId } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    requirePermission(user.role, "drift:run");
    requireRole(user.role, ["owner", "admin", "operator"]);

    const body = await request.json();
    const parsed = replayQueueJobSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid replay payload", parsed.error.flatten());
    }

    const replay = await replayFailedQueueJob({
      queue: parsed.data.queue,
      jobId: parsed.data.job_id,
    });

    await writeAuditLog({
      organisationId,
      eventType: "queue_failed_job_replayed",
      actorType: "user",
      actorId: userId,
      details: {
        queue: replay.queue,
        queue_name: replay.queue_name,
        job_id: replay.job_id,
      },
    });

    return ok(replay);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    if (error instanceof Error && (error.message.startsWith("Invalid state") || error.message.startsWith("Not found"))) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
