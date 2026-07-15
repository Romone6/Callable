import { CommandStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forbidden, ok, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { requireApiKey } from "@/lib/api-key-auth";
import { corsResponse } from "@/lib/api-security";
import { enforceRateLimit } from "@/lib/rate-limit";

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
}

export async function GET(request: Request) {
  try {
    const rate = await enforceRateLimit(request, "agent-commands-read");
    if (!rate.allowed) {
      return tooManyRequests("Rate limit exceeded", { limit: rate.limit, reset_seconds: rate.resetSeconds });
    }

    const keyContext = await requireApiKey(request, ["commands:read"]);
    const commands = await prisma.actionCommand.findMany({
      where: {
        organisationId: keyContext.organisationId,
        status: CommandStatus.published,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ commands });
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
