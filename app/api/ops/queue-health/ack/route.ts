import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { acknowledgeFailedQueueJob } from "@/lib/queue-observability";
import { acknowledgeQueueJobSchema } from "@/lib/schemas";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const { user, userId, organisationId } = await getDevContext();
    requirePermission(user.role, "executions:manage");
    requirePermission(user.role, "drift:run");
    requireRole(user.role, ["owner", "admin", "operator"]);

    const body = await request.json();
    const parsed = acknowledgeQueueJobSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid queue acknowledgement payload", parsed.error.flatten());
    }

    const ack = await acknowledgeFailedQueueJob({
      queue: parsed.data.queue,
      jobId: parsed.data.job_id,
    });

    await writeAuditLog({
      organisationId,
      eventType: "queue_failed_job_acknowledged",
      actorType: "user",
      actorId: userId,
      details: {
        queue: ack.queue,
        queue_name: ack.queue_name,
        job_id: ack.job_id,
        note: parsed.data.note ?? null,
      },
    });

    return ok(ack);
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
