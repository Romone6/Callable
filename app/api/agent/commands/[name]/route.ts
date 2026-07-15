import { CommandStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forbidden, notFound, ok, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { requireApiKey } from "@/lib/api-key-auth";
import { corsResponse } from "@/lib/api-security";
import { enforceRateLimit } from "@/lib/rate-limit";

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
}

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const rate = await enforceRateLimit(request, "agent-command-describe");
    if (!rate.allowed) {
      return tooManyRequests("Rate limit exceeded", { limit: rate.limit, reset_seconds: rate.resetSeconds });
    }

    const keyContext = await requireApiKey(request, ["commands:read"]);
    const { name } = await params;

    const command = await prisma.actionCommand.findFirst({
      where: {
        organisationId: keyContext.organisationId,
        name,
        status: CommandStatus.published,
      },
      include: { steps: true },
    });

    if (!command) return notFound("Command not found");

    return ok({ command });
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
