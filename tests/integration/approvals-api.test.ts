import { randomUUID } from "node:crypto";
import { PrismaClient, ExecutionStatus, ApprovalStatus } from "@prisma/client";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { POST as createApproval } from "@/app/api/approvals/route";

const prisma = new PrismaClient();
const ids: string[] = [];

let organisationId = "";
let commandId = "";
let executionId = "";

beforeAll(async () => {
  const user = await prisma.user.findFirstOrThrow();
  organisationId = user.organisationId;

  const command = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: `approval_create_test_${Date.now()}`,
      description: "approval creation test",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "medium",
      approvalRulesJson: { amount_greater_than: 200 },
      successCondition: "ok",
      failureConditionsJson: [],
      sourceEvidenceJson: ["test"],
      status: "published",
    },
  });
  commandId = command.id;
  ids.push(command.id);

  const execution = await prisma.commandExecution.create({
    data: {
      organisationId,
      commandId,
      agentName: "approval-api-test",
      userId: user.id,
      inputJson: { ticket_id: "TCK-1001", amount: 350, reason: "duplicate billing" },
      status: ExecutionStatus.running,
      executionMode: "api",
      startedAt: new Date(),
    },
  });
  executionId = execution.id;
  ids.push(execution.id);
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { executionId: { in: ids } } });
  await prisma.approval.deleteMany({ where: { executionId: { in: ids } } });
  await prisma.commandExecution.deleteMany({ where: { id: { in: ids } } });
  await prisma.commandStep.deleteMany({ where: { commandId: { in: ids } } });
  await prisma.actionCommand.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("approvals API", () => {
  it("creates controlled approval request and updates execution status", async () => {
    const request = new Request("http://localhost/api/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        execution_id: executionId,
        reason: `manual check ${randomUUID().slice(0, 6)}`,
        requested_by_agent: "manual-reviewer",
      }),
    });

    const response = await createApproval(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.approval.status).toBe(ApprovalStatus.pending);

    const execution = await prisma.commandExecution.findUniqueOrThrow({ where: { id: executionId } });
    expect(execution.status).toBe(ExecutionStatus.waiting_for_approval);
    expect(execution.approvalStatus).toBe(ApprovalStatus.pending);
  });

  it("returns existing pending approval without duplicate creation", async () => {
    const request = new Request("http://localhost/api/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ execution_id: executionId, reason: "duplicate" }),
    });

    const response = await createApproval(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reused).toBe(true);
  });
});
