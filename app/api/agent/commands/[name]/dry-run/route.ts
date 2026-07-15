import { forbidden, ok, unauthorized, serverError, tooManyRequests } from "@/lib/http";
import { runCommandThroughQueue } from "@/lib/execution-queue";
import { requireApiKey } from "@/lib/api-key-auth";
import { parseCommandRunRequest } from "@/lib/command-run-contract";
import { corsResponse } from "@/lib/api-security";
import { enforceRateLimit } from "@/lib/rate-limit";

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
}

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const rate = await enforceRateLimit(request, "agent-command-dry-run");
    if (!rate.allowed) {
      return tooManyRequests("Rate limit exceeded", { limit: rate.limit, reset_seconds: rate.resetSeconds });
    }

    const keyContext = await requireApiKey(request, ["commands:run"]);
    const { name } = await params;

    const parsed = await parseCommandRunRequest(request);
    if (parsed.error) {
      return parsed.error;
    }

    const result = await runCommandThroughQueue({
      organisationId: keyContext.organisationId,
      userId: keyContext.apiKeyId,
      commandName: name,
      agentName: parsed.data.agent_name,
      input: parsed.data.input,
      dryRun: true,
      idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
    });

    return ok(result);
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
