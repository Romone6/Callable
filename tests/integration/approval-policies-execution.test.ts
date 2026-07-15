import { randomUUID } from "node:crypto";
import { ApprovalStatus, CommandStatus, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCommandByName } from "@/lib/execution";

const prisma = new PrismaClient();

let organisationId = "";
let userId = "";
let commandId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Approval Policy Exec Org ${suffix}`,
      slug: `approval-policy-exec-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `approval-policy-exec-${suffix}@example.com`,
      name: "Approval Policy Executor",
      role: "owner",
    },
  });
  userId = user.id;

  await prisma.approvalPolicy.create({
    data: {
      organisationId,
      name: "Org Default Policy",
      status: "active",
      isDefault: true,
      policyJson: {
        thresholds: { amount_greater_than: 100 },
        stages: [{ name: "org_finance_review", required_role: "admin", amount_greater_than: 100 }],
      },
    },
  });

  const command = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: `policy_fallback_refund_${suffix}`,
      description: "Policy fallback command",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { ok: "boolean" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "medium",
      approvalRulesJson: null,
      successCondition: "ok",
      failureConditionsJson: [],
      sourceEvidenceJson: ["test"],
      status: CommandStatus.published,
    },
  });
  commandId = command.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.approval.deleteMany({ where: { organisationId } });
  await prisma.commandExecution.deleteMany({ where: { organisationId } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.approvalPolicy.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("approval policy fallback in execution", () => {
  it("requires approval from org default policy when command-level rules are absent", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName: (await prisma.actionCommand.findUniqueOrThrow({ where: { id: commandId } })).name,
      agentName: "policy-fallback-test",
      input: {
        ticket_id: "TICKET-1001",
        amount: 150,
        reason: "policy threshold test",
      },
    });

    expect(result.status).toBe("waiting_for_approval");
    if (result.status !== "waiting_for_approval") {
      throw new Error("Expected waiting_for_approval");
    }

    const approval = await prisma.approval.findFirst({
      where: {
        organisationId,
        executionId: result.execution_id,
        status: ApprovalStatus.pending,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(approval).not.toBeNull();
    expect(approval?.stageName).toBe("org_finance_review");
  });
});
