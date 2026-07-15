import { PrismaClient, ExecutionStatus } from "@prisma/client";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { runCommandByName } from "@/lib/execution";

const prisma = new PrismaClient();

let organisationId = "";
let userId = "";
let commandName = "";
let ticketCode = "";

beforeAll(async () => {
  const suffix = Date.now().toString().slice(-6);

  const org = await prisma.organisation.create({
    data: { name: `Contract Org ${suffix}`, slug: `contract-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `contract-${suffix}@example.com`,
      name: "Contract Tester",
      role: "owner",
    },
  });
  userId = user.id;

  const customer = await prisma.customer.create({
    data: {
      organisationId,
      externalId: `EXT-C-${suffix}`,
      email: `customer-${suffix}@example.com`,
      name: "Contract Customer",
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      organisationId,
      customerId: customer.id,
      ticketCode: `TCK-${suffix}`,
      subject: "Contract Refund",
      description: "Contract flow",
      status: "open",
      refundEligible: true,
    },
  });
  ticketCode = ticket.ticketCode;

  commandName = `issue_refund_contract_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      name: commandName,
      description: "Contract run command",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "medium",
      approvalRulesJson: { amount_greater_than: 200 },
      successCondition: "ok",
      failureConditionsJson: [],
      sourceEvidenceJson: ["contract"],
      status: "published",
    },
  });

});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.approval.deleteMany({ where: { organisationId } });
  await prisma.commandExecution.deleteMany({ where: { organisationId } });
  await prisma.commandStep.deleteMany({ where: { command: { organisationId } } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.refund.deleteMany({ where: { organisationId } });
  await prisma.ticket.deleteMany({ where: { organisationId } });
  await prisma.customer.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("command run contract", () => {
  it("returns failed contract response for invalid input and persists failed execution", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName,
      agentName: "contract-agent",
      input: {
        ticket_id: ticketCode,
        amount: 20,
      },
    });

    expect(result.status).toBe("failed");
    expect(result.execution_id.length).toBeGreaterThan(0);

    const execution = await prisma.commandExecution.findUniqueOrThrow({ where: { id: result.execution_id } });
    expect(execution.status).toBe(ExecutionStatus.failed);
    expect(execution.errorMessage).toContain("Input validation failed");
  });

  it("supports dry_run and returns succeeded contract with dry_run output", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName,
      agentName: "contract-agent",
      dryRun: true,
      input: {
        ticket_id: ticketCode,
        amount: 25,
        reason: "test",
      },
    });

    expect(result.status).toBe("succeeded");
    expect(result.output.dry_run).toBe(true);
  });
});
