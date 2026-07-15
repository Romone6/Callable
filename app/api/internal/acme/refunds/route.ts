import { getDevContext } from "@/lib/auth";
import { issueRefundFromTicket } from "@/lib/acme";
import { badRequest, ok, serverError } from "@/lib/http";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-internal-token");
    if (token !== env.INTERNAL_EXECUTION_TOKEN) {
      return badRequest("Invalid internal execution token");
    }

    let organisationId = request.headers.get("x-organisation-id");
    if (!organisationId) {
      const ctx = await getDevContext();
      organisationId = ctx.organisationId;
    }
    if (!organisationId) {
      return badRequest("organisation_id could not be resolved");
    }
    const body = await request.json();

    if (typeof body.ticket_id !== "string" || typeof body.amount !== "number" || typeof body.reason !== "string") {
      return badRequest("ticket_id (string), amount (number), reason (string) are required");
    }

    const output = await issueRefundFromTicket({
      organisationId,
      ticketId: body.ticket_id,
      amount: body.amount,
      reason: body.reason,
    });

    return ok(output);
  } catch (error) {
    return serverError(error);
  }
}

