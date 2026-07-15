import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runDriftCheck } from "@/lib/drift";

const prisma = new PrismaClient();
let organisationId = "";
let commandId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: { name: `Drift Org ${suffix}`, slug: `drift-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const command = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: `drift_command_${suffix}`,
      description: "drift command",
      inputSchemaJson: { ticket_id: "string" },
      outputSchemaJson: { status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      successCondition: "ok",
      sourceEvidenceJson: ["drift test"],
      failureConditionsJson: [],
      status: "published",
    },
  });
  commandId = command.id;

  await prisma.commandStep.create({
    data: {
      commandId,
      stepIndex: 0,
      stepType: "api",
      apiRoute: "/api/this-route-does-not-exist",
      httpMethod: "GET",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.driftCheck.deleteMany({ where: { organisationId } });
  await prisma.commandStep.deleteMany({ where: { commandId } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("drift monitor", () => {
  it("stores broken/warning result from real check", async () => {
    const check = await runDriftCheck(commandId, organisationId);
    expect(["warning", "broken", "healthy"]).toContain(check.status);

    const stored = await prisma.driftCheck.findMany({ where: { organisationId } });
    expect(stored.length).toBe(1);
  }, 20000);

  it("stores browser_unavailable issue instead of throwing when browser launch fails", async () => {
    const suffix = randomUUID().slice(0, 8);
    const selectorCommand = await prisma.actionCommand.create({
      data: {
        organisationId,
        name: `drift_selector_${suffix}`,
        description: "selector drift command",
        inputSchemaJson: { ticket_id: "string" },
        outputSchemaJson: { status: "string" },
        executionStrategy: "api_first_browser_fallback",
        riskLevel: "low",
        successCondition: "ok",
        sourceEvidenceJson: ["drift selector test"],
        failureConditionsJson: [],
        status: "published",
      },
    });

    await prisma.commandStep.create({
      data: {
        commandId: selectorCommand.id,
        stepIndex: 0,
        stepType: "browser",
        selector: "[data-never-exists]",
      },
    });

    const originalChannel = process.env.PLAYWRIGHT_CHANNEL;
    process.env.PLAYWRIGHT_CHANNEL = "not-a-real-channel";
    let check;
    try {
      check = await runDriftCheck(selectorCommand.id, organisationId);
    } finally {
      process.env.PLAYWRIGHT_CHANNEL = originalChannel;
    }

    expect(check?.status).toBe("broken");
    expect(check?.issueType).toBe("browser_unavailable");

    await prisma.commandStep.deleteMany({ where: { commandId: selectorCommand.id } });
    await prisma.actionCommand.delete({ where: { id: selectorCommand.id } });
  });
});
