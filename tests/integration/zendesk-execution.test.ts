import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { PrismaClient, ExecutionMode } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCommandByName } from "@/lib/execution";

const prisma = new PrismaClient();

let organisationId = "";
let userId = "";
let commandName = "";
let server: ReturnType<typeof createServer> | null = null;
let baseUrl = "";

beforeAll(async () => {
  const suffix = Date.now().toString().slice(-6);

  const org = await prisma.organisation.create({
    data: { name: `Zendesk Exec Org ${suffix}`, slug: `zendesk-exec-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `zendesk-exec-${suffix}@example.com`,
      name: "Zendesk Exec Tester",
      role: "owner",
    },
  });
  userId = user.id;

  process.env.ZENDESK_TEST_TOKEN = "zd_test_token";
  process.env.ZENDESK_TEST_EMAIL = "ops@example.com";

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "PUT" || req.url !== "/api/v2/tickets/TCK-9001.json") {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const expected = Buffer.from(`${process.env.ZENDESK_TEST_EMAIL}/token:${process.env.ZENDESK_TEST_TOKEN}`).toString("base64");
    if (req.headers.authorization !== `Basic ${expected}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const parsed = JSON.parse(body) as { ticket?: { status?: string } };
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ticket: { id: "TCK-9001", status: parsed.ticket?.status ?? "open" } }));
    });
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const app = await prisma.app.create({
    data: {
      organisationId,
      name: `Zendesk Connector ${suffix}`,
      type: "api_schema",
      baseUrl,
      authMethod: "token",
      executionMode: "api",
      connectionStatus: "connected",
      metadataJson: {
        provider_key: "zendesk",
        auth_env_key: "ZENDESK_TEST_TOKEN",
        username_env_key: "ZENDESK_TEST_EMAIL",
      },
    },
  });

  commandName = `update_zendesk_ticket_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      appId: app.id,
      name: commandName,
      description: "Update Zendesk ticket",
      inputSchemaJson: { ticket_id: "string", status: "string", comment: "string" },
      outputSchemaJson: { ticket_id: "string", status: "string", provider: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      approvalRulesJson: {},
      successCondition: "ticket updated",
      failureConditionsJson: [],
      sourceEvidenceJson: ["zendesk"],
      status: "published",
    },
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.approval.deleteMany({ where: { organisationId } });
  await prisma.commandExecution.deleteMany({ where: { organisationId } });
  await prisma.commandStep.deleteMany({ where: { command: { organisationId } } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.app.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });

  delete process.env.ZENDESK_TEST_TOKEN;
  delete process.env.ZENDESK_TEST_EMAIL;
  await prisma.$disconnect();
});

describe("zendesk execution adapter", () => {
  it("updates a Zendesk ticket through provider adapter", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName,
      agentName: "zendesk-agent",
      input: {
        ticket_id: "TCK-9001",
        status: "solved",
        comment: "Refund issued and customer notified.",
      },
    });

    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.execution_mode).toBe(ExecutionMode.api);
    expect(result.output.provider).toBe("zendesk");
    expect(result.output.ticket_id).toBe("TCK-9001");
    expect(result.output.status).toBe("solved");
  });
});
