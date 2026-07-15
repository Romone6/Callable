import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as dryRunCommand } from "@/app/api/commands/[id]/dry-run/route";

const prisma = new PrismaClient();

let organisationId = "";
let commandId = "";
let commandName = "";
let ticketCode = "";
let customerId = "";
let ticketId = "";

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No development user found. Run seed first.");
  }
  organisationId = user.organisationId;

  const suffix = randomUUID().slice(0, 8);
  const customer = await prisma.customer.create({
    data: {
      organisationId,
      externalId: `EXT-QUEUE-${suffix}`,
      email: `queue-${suffix}@example.com`,
      name: "Queue Test Customer",
    },
  });
  customerId = customer.id;

  const ticket = await prisma.ticket.create({
    data: {
      organisationId,
      customerId: customer.id,
      ticketCode: `TCK-QUEUE-${suffix}`,
      subject: "Queue Dry Run",
      description: "Queue dry run test",
      status: "open",
      refundEligible: true,
    },
  });
  ticketId = ticket.id;
  ticketCode = ticket.ticketCode;

  commandName = `queue_dry_run_${suffix}`;
  const command = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: commandName,
      description: "Queue dry run command",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { dry_run: "boolean", validated: "boolean" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      approvalRulesJson: { amount_greater_than: 5000 },
      successCondition: "dry run validation passes",
      failureConditionsJson: [],
      sourceEvidenceJson: ["queue-test"],
      status: "published",
    },
  });
  commandId = command.id;
});

afterAll(async () => {
  if (commandId) {
    await prisma.commandStep.deleteMany({ where: { commandId } });
    await prisma.commandExecution.deleteMany({ where: { commandId } });
    await prisma.actionCommand.deleteMany({ where: { id: commandId } });
  }
  if (ticketId) {
    await prisma.refund.deleteMany({ where: { ticketId } });
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
  }
  if (customerId) {
    await prisma.customer.deleteMany({ where: { id: customerId } });
  }
  await prisma.$disconnect();
});

describe("queue-backed command execution", () => {
  it("executes dry-run through BullMQ path and returns contract response", async () => {
    const response = await dryRunCommand(
      new Request(`http://localhost:3100/api/commands/${commandId}/dry-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": `idem-${Date.now()}`,
        },
        body: JSON.stringify({
          agent_name: "queue-test-agent",
          input: {
            ticket_id: ticketCode,
            amount: 25,
            reason: "test dry run",
          },
        }),
      }),
      { params: Promise.resolve({ id: commandId }) },
    );

    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body.status).toBe("succeeded");
    expect(body.output?.dry_run).toBe(true);
    expect(body.execution_mode).toBe("api");

    const execution = await prisma.commandExecution.findUniqueOrThrow({ where: { id: body.execution_id } });
    expect(execution.commandId).toBe(commandId);
    expect(execution.status).toBe("succeeded");
  }, 20000);
});
