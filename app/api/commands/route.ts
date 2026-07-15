import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "commands:read");
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const risk = url.searchParams.get("risk");
    const appId = url.searchParams.get("app_id");

    const commands = await prisma.actionCommand.findMany({
      where: {
        organisationId,
        status: status ? (status as never) : undefined,
        riskLevel: risk ? (risk as never) : undefined,
        appId: appId ?? undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ commands });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "commands:manage");
    const json = await request.json();
    if (!json.name || !json.description || !json.input_schema_json || !json.output_schema_json) {
      return badRequest("Missing required command fields");
    }

    const command = await prisma.actionCommand.create({
      data: {
        organisationId,
        appId: json.app_id,
        name: json.name,
        description: json.description,
        inputSchemaJson: json.input_schema_json,
        outputSchemaJson: json.output_schema_json,
        executionStrategy: json.execution_strategy ?? "api_first_browser_fallback",
        riskLevel: json.risk_level ?? "medium",
        approvalRulesJson: json.approval_rules_json ?? null,
        successCondition: json.success_condition ?? "command finished",
        failureConditionsJson: json.failure_conditions_json ?? [],
        sourceEvidenceJson: json.source_evidence_json ?? [],
      },
    });

    return ok({ command }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
