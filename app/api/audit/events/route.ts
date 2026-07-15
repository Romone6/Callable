import { ActorType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, ok, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { requireApiKey } from "@/lib/api-key-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
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

function parseActorType(rawActorType: string | null) {
  if (!rawActorType) {
    return null;
  }
  const value = rawActorType.trim();
  if (!value) {
    return null;
  }
  if (value !== ActorType.agent && value !== ActorType.user && value !== ActorType.system) {
    return "invalid";
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const rate = await enforceRateLimit(request, "audit-events-read");
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

    const actorType = parseActorType(url.searchParams.get("actor_type"));
    if (actorType === "invalid") {
      return badRequest("Invalid actor_type query parameter. Expected 'system', 'user', or 'agent'.");
    }

    const eventType = (url.searchParams.get("event_type") ?? "").trim() || undefined;
    const actorId = (url.searchParams.get("actor_id") ?? "").trim() || undefined;
    const commandId = (url.searchParams.get("command_id") ?? "").trim() || undefined;
    const executionId = (url.searchParams.get("execution_id") ?? "").trim() || undefined;

    const rows = await prisma.auditLog.findMany({
      where: {
        organisationId: keyContext.organisationId,
        eventType,
        actorType: actorType ?? undefined,
        actorId,
        commandId,
        executionId,
        createdAt: before ? { lt: before } : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const nextBefore = hasMore ? pageRows[pageRows.length - 1]?.createdAt.toISOString() ?? null : null;

    return ok({
      events: pageRows.map((row) => ({
        id: row.id,
        event_type: row.eventType,
        actor_type: row.actorType,
        actor_id: row.actorId,
        command_id: row.commandId,
        execution_id: row.executionId,
        details: row.detailsJson,
        created_at: row.createdAt.toISOString(),
      })),
      page: {
        limit,
        before: before?.toISOString() ?? null,
        next_before: nextBefore,
        has_more: hasMore,
      },
      filters: {
        event_type: eventType ?? null,
        actor_type: actorType ?? null,
        actor_id: actorId ?? null,
        command_id: commandId ?? null,
        execution_id: executionId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Unauthorized") || error.message.startsWith("Forbidden"))) {
      return authError(error.message);
    }
    return serverError(error);
  }
}
