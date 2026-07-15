import { prisma } from "@/lib/db";
import { forbidden, notFound, ok, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { requireApiKey } from "@/lib/api-key-auth";
import { corsResponse } from "@/lib/api-security";
import { enforceRateLimit } from "@/lib/rate-limit";

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rate = await enforceRateLimit(request, "agent-execution-read");
    if (!rate.allowed) {
      return tooManyRequests("Rate limit exceeded", { limit: rate.limit, reset_seconds: rate.resetSeconds });
    }

    const keyContext = await requireApiKey(request, ["executions:read"]);
    const { id } = await params;
    const execution = await prisma.commandExecution.findFirst({
      where: { id, organisationId: keyContext.organisationId },
    });

    if (!execution) {
      return notFound("Execution not found");
    }

    return ok({ execution });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Unauthorized") || error.message.startsWith("Forbidden"))) {
      return authError(error.message);
    }
    return serverError(error);
  }
}

export async function OPTIONS(request: Request) {
  return corsResponse(request);
}
