import { prisma } from "@/lib/db";
import { badRequest, forbidden, ok, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { requireApiKey } from "@/lib/api-key-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

type McpAuditOutcome = "succeeded" | "failed";

type JsonRecord = Record<string, unknown>;

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
}

function asJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function parseLimit(rawLimit: string | null) {
  if (!rawLimit) return 50;
  const limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }
  return Math.min(200, Math.floor(limit));
}

function parseBefore(rawBefore: string | null) {
  if (!rawBefore) return null;
  const date = new Date(rawBefore);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function GET(request: Request) {
  try {
    const rate = await enforceRateLimit(request, "mcp-audit-read");
    if (!rate.allowed) {
      return tooManyRequests("Rate limit exceeded", { limit: rate.limit, reset_seconds: rate.resetSeconds });
    }

    const keyContext = await requireApiKey(request, ["audit:read"]);
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    if (!limit) {
      return badRequest("Invalid limit query parameter. Expected a positive integer.");
    }

    const before = parseBefore(url.searchParams.get("before"));
    if (url.searchParams.get("before") && !before) {
      return badRequest("Invalid before query parameter. Expected an ISO-8601 timestamp.");
    }

    const tool = (url.searchParams.get("tool") ?? "").trim();
    const outcomeParam = (url.searchParams.get("outcome") ?? "").trim();
    if (outcomeParam && outcomeParam !== "succeeded" && outcomeParam !== "failed") {
      return badRequest("Invalid outcome query parameter. Expected 'succeeded' or 'failed'.");
    }
    const outcome = (outcomeParam || null) as McpAuditOutcome | null;

    const rows = await prisma.auditLog.findMany({
      where: {
        organisationId: keyContext.organisationId,
        eventType: "mcp_tool_invocation",
        createdAt: before ? { lt: before } : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const filtered = rows
      .map((row) => {
        const details = asJsonRecord(row.detailsJson);
        const rowTool = typeof details.tool === "string" ? details.tool : "";
        const rowOutcome = details.outcome === "failed" ? "failed" : details.outcome === "succeeded" ? "succeeded" : "";
        return {
          id: row.id,
          event_type: row.eventType,
          actor_type: row.actorType,
          actor_id: row.actorId,
          command_id: row.commandId,
          execution_id: row.executionId,
          created_at: row.createdAt.toISOString(),
          tool: rowTool,
          outcome: rowOutcome,
          details,
        };
      })
      .filter((row) => (tool ? row.tool === tool : true))
      .filter((row) => (outcome ? row.outcome === outcome : true))
      .slice(0, limit);

    const nextCursor = filtered.length === limit ? filtered[filtered.length - 1]?.created_at ?? null : null;
    return ok({
      events: filtered,
      page: {
        limit,
        before: before?.toISOString() ?? null,
        next_before: nextCursor,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Unauthorized") || error.message.startsWith("Forbidden"))) {
      return authError(error.message);
    }
    return serverError(error);
  }
}
