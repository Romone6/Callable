import { CommandStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, ok, serverError, tooManyRequests, unauthorized } from "@/lib/http";
import { runCommandByName } from "@/lib/execution";
import { requireApiKey, type ApiKeyScope } from "@/lib/api-key-auth";
import { corsResponse } from "@/lib/api-security";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

function authError(message: string) {
  return message.toLowerCase().startsWith("forbidden") ? forbidden(message) : unauthorized(message);
}

async function withScope(request: Request, scopes: ApiKeyScope[]) {
  return requireApiKey(request, scopes);
}

const MCP_TOOL_SCOPES: Record<string, ApiKeyScope[]> = {
  list_commands: ["commands:read"],
  describe_command: ["commands:read"],
  dry_run_command: ["commands:run"],
  run_command: ["commands:run"],
  get_execution_status: ["executions:read"],
  get_command_health: ["commands:read"],
  get_audit_log: ["audit:read"],
};

async function writeMcpInvocationAudit(input: {
  organisationId: string;
  actorId: string;
  tool: string;
  outcome: "succeeded" | "failed";
  error?: string;
}) {
  await writeAuditLog({
    organisationId: input.organisationId,
    actorType: "agent",
    actorId: input.actorId,
    eventType: "mcp_tool_invocation",
    details: {
      tool: input.tool,
      outcome: input.outcome,
      error: input.error,
    },
  });
}

export async function POST(request: Request) {
  let invocationContext: { organisationId: string; apiKeyId: string; tool: string } | null = null;
  try {
    const rate = await enforceRateLimit(request, "mcp-tools");
    if (!rate.allowed) {
      return tooManyRequests("Rate limit exceeded", { limit: rate.limit, reset_seconds: rate.resetSeconds });
    }

    const body = await request.json();
    const tool = body.tool as string;
    const args = (body.args ?? {}) as Record<string, unknown>;
    const requiredScopes = MCP_TOOL_SCOPES[tool];
    if (!requiredScopes) {
      return badRequest(`Unsupported MCP tool: ${tool}`);
    }

    const key = await withScope(request, requiredScopes);
    invocationContext = {
      organisationId: key.organisationId,
      apiKeyId: key.apiKeyId,
      tool,
    };

    switch (tool) {
      case "list_commands": {
        const commands = await prisma.actionCommand.findMany({
          where: { organisationId: key.organisationId, status: CommandStatus.published },
          select: { name: true, description: true, healthStatus: true, riskLevel: true },
        });
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result: commands });
      }
      case "describe_command": {
        const name = String(args.name ?? "");
        const command = await prisma.actionCommand.findFirst({ where: { organisationId: key.organisationId, name } });
        if (!command) return badRequest(`Command not found: ${name}`);
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result: command });
      }
      case "dry_run_command": {
        const result = await runCommandByName({
          organisationId: key.organisationId,
          userId: key.apiKeyId,
          commandName: String(args.command_name ?? ""),
          agentName: String(args.agent_name ?? "mcp-agent"),
          input: (args.input as Record<string, unknown>) ?? {},
          dryRun: true,
          idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
        });
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result });
      }
      case "run_command": {
        const result = await runCommandByName({
          organisationId: key.organisationId,
          userId: key.apiKeyId,
          commandName: String(args.command_name ?? ""),
          agentName: String(args.agent_name ?? "mcp-agent"),
          input: (args.input as Record<string, unknown>) ?? {},
          idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
        });
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result });
      }
      case "get_execution_status": {
        const executionId = String(args.execution_id ?? "");
        const execution = await prisma.commandExecution.findFirst({ where: { id: executionId, organisationId: key.organisationId } });
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result: execution });
      }
      case "get_command_health": {
        const name = String(args.name ?? "");
        const command = await prisma.actionCommand.findFirst({ where: { organisationId: key.organisationId, name } });
        if (!command) return badRequest(`Command not found: ${name}`);
        const latest = await prisma.driftCheck.findFirst({
          where: { organisationId: key.organisationId, commandId: command.id },
          orderBy: { checkedAt: "desc" },
        });
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result: { health: command.healthStatus, latest_check: latest } });
      }
      case "get_audit_log": {
        const logs = await prisma.auditLog.findMany({
          where: { organisationId: key.organisationId },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit ?? 50),
        });
        await writeMcpInvocationAudit({
          organisationId: key.organisationId,
          actorId: key.apiKeyId,
          tool,
          outcome: "succeeded",
        });
        return ok({ result: logs });
      }
      default:
        return badRequest(`Unsupported MCP tool: ${tool}`);
    }
  } catch (error) {
    if (invocationContext) {
      await writeMcpInvocationAudit({
        organisationId: invocationContext.organisationId,
        actorId: invocationContext.apiKeyId,
        tool: invocationContext.tool,
        outcome: "failed",
        error: error instanceof Error ? error.message : "Unexpected error",
      });
    }
    if (error instanceof Error && (error.message.startsWith("Unauthorized") || error.message.startsWith("Forbidden"))) {
      return authError(error.message);
    }
    return serverError(error);
  }
}

export async function OPTIONS(request: Request) {
  return corsResponse(request);
}
