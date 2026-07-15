import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "commands:read");
    const { id } = await params;
    const command = await prisma.actionCommand.findFirst({
      where: { id, organisationId },
      include: {
        steps: true,
        executions: { orderBy: { createdAt: "desc" }, take: 10 },
        drifts: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!command) return notFound("Command not found");
    return ok({ command });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "commands:manage");
    const { id } = await params;
    const json = await request.json();

    const existing = await prisma.actionCommand.findFirst({ where: { id, organisationId } });
    if (!existing) return notFound("Command not found");

    const command = await prisma.actionCommand.update({
      where: { id },
      data: {
        description: typeof json.description === "string" ? json.description : undefined,
        inputSchemaJson: json.input_schema_json,
        outputSchemaJson: json.output_schema_json,
        approvalRulesJson: json.approval_rules_json,
        successCondition: typeof json.success_condition === "string" ? json.success_condition : undefined,
      },
    });

    return ok({ command });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
