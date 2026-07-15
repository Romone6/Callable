import { createHash, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test("refund workflow and agent endpoint execution", async ({ page, request }) => {
  const user = await prisma.user.findFirstOrThrow();

  const suffix = randomUUID().slice(0, 6);
  const customer = await prisma.customer.create({
    data: {
      organisationId: user.organisationId,
      externalId: `E2E-${suffix}`,
      name: "E2E Customer",
      email: `e2e-${suffix}@example.com`,
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      organisationId: user.organisationId,
      customerId: customer.id,
      ticketCode: `TCK-E2E-${suffix}`,
      subject: "E2E duplicate billing",
      description: "E2E refund",
      status: "open",
      refundEligible: true,
    },
  });

  let command = await prisma.actionCommand.findFirst({
    where: { organisationId: user.organisationId, name: "issue_refund_from_ticket", status: "published" },
  });

  if (!command) {
    command = await prisma.actionCommand.create({
      data: {
        organisationId: user.organisationId,
        name: "issue_refund_from_ticket",
        description: "Issues a refund",
        inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
        outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
        executionStrategy: "api_first_browser_fallback",
        riskLevel: "medium",
        approvalRulesJson: { amount_greater_than: 200 },
        successCondition: "ok",
        failureConditionsJson: [],
        sourceEvidenceJson: ["e2e"],
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
  }

  await page.goto(`/acme/tickets/${ticket.ticketCode}`);
  await page.fill('[data-testid="refund-amount"]', "22");
  await page.fill('[data-testid="refund-reason"]', "e2e duplicate billing");
  await page.click('[data-testid="refund-submit"]');

  await expect(page.locator('[data-testid="refund-confirmation"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="ticket-status"]')).toHaveText("refund_issued");

  const apiTicket = await prisma.ticket.findFirstOrThrow({ where: { id: ticket.id } });
  expect(apiTicket.status).toBe("refund_issued");

  const apiKeyPlain = `vk_e2e_${randomUUID().slice(0, 10)}`;
  await prisma.apiKey.create({
    data: {
      organisationId: user.organisationId,
      name: `playwright-key-${suffix}`,
      keyHash: createHash("sha256").update(apiKeyPlain).digest("hex"),
      scopesJson: ["commands:read", "commands:run", "executions:read", "audit:read"],
    },
  });

  const runRes = await request.post(`/api/agent/commands/${command.name}/run`, {
    headers: {
      Authorization: `Bearer ${apiKeyPlain}`,
      "x-idempotency-key": `e2e-run-${suffix}`,
    },
    data: {
      agent_name: "playwright-agent",
      input: {
        ticket_id: ticket.ticketCode,
        amount: 30,
        reason: "second adjustment",
      },
    },
  });

  expect(runRes.ok()).toBeTruthy();
  const runBody = await runRes.json();
  expect(runBody.status).toBe("succeeded");

  const executionId = runBody.execution_id;
  const auditLog = await prisma.auditLog.findFirst({
    where: {
      organisationId: user.organisationId,
      executionId,
      eventType: "command_execution_succeeded",
    },
  });

  expect(auditLog).not.toBeNull();
});
