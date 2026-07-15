import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCommandByName } from "@/lib/execution";

const prisma = new PrismaClient();
let organisationId = "";
let userId = "";
let commandName = "";
let ticketCode = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: { name: `Approval Org ${suffix}`, slug: `approval-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `reviewer-${suffix}@example.com`,
      name: "Reviewer",
      role: "admin",
    },
  });
  userId = user.id;

  const customer = await prisma.customer.create({
    data: {
      organisationId,
      externalId: `EXT-${suffix}`,
      email: `cust-${suffix}@example.com`,
      name: "Cust",
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      organisationId,
      customerId: customer.id,
      ticketCode: `TCK-${suffix}`,
      subject: "Refund",
      description: "Need refund",
      status: "open",
      refundEligible: true,
    },
  });
  ticketCode = ticket.ticketCode;

  commandName = `issue_refund_from_ticket_${suffix}`;

  const command = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: commandName,
      description: "Issues refund",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "medium",
      approvalRulesJson: { amount_greater_than: 200 },
      successCondition: "created",
      failureConditionsJson: ["failed"],
      sourceEvidenceJson: ["test-source"],
      status: "published",
    },
  });

  await prisma.commandStep.create({
    data: {
      commandId: command.id,
      stepIndex: 0,
      stepType: "api",
      apiRoute: "/api/internal/acme/refunds",
      httpMethod: "POST",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.approval.deleteMany({ where: { organisationId } });
  await prisma.commandExecution.deleteMany({ where: { organisationId } });
  await prisma.commandStep.deleteMany({ where: { command: { organisationId } } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.ticket.deleteMany({ where: { organisationId } });
  await prisma.customer.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("approval flow", () => {
  it("creates pending approval when amount exceeds threshold", async () => {
    const response = await runCommandByName({
      organisationId,
      userId,
      commandName,
      agentName: "test-agent",
      input: {
        ticket_id: ticketCode,
        amount: 450,
        reason: "duplicate billing",
      },
    });

    expect(response.status).toBe("waiting_for_approval");

    const approvals = await prisma.approval.findMany({ where: { organisationId, status: "pending" } });
    expect(approvals.length).toBe(1);
  });
});
