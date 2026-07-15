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
    data: { name: `HubSpot Exec Org ${suffix}`, slug: `hubspot-exec-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `hubspot-exec-${suffix}@example.com`,
      name: "HubSpot Exec Tester",
      role: "owner",
    },
  });
  userId = user.id;

  process.env.HUBSPOT_TEST_TOKEN = "hs_test_token";

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "PATCH" || req.url !== "/crm/v3/objects/contacts/customer%40example.com?idProperty=email") {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    if (req.headers.authorization !== `Bearer ${process.env.HUBSPOT_TEST_TOKEN}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const parsed = JSON.parse(body) as { properties?: Record<string, unknown> };
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ id: "12345", properties: parsed.properties ?? {} }));
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
      name: `HubSpot Connector ${suffix}`,
      type: "api_schema",
      baseUrl,
      authMethod: "bearer",
      executionMode: "api",
      connectionStatus: "connected",
      metadataJson: {
        provider_key: "hubspot",
        auth_env_key: "HUBSPOT_TEST_TOKEN",
      },
    },
  });

  commandName = `update_hubspot_contact_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      appId: app.id,
      name: commandName,
      description: "Update HubSpot contact",
      inputSchemaJson: { email: "string", firstname: "string", lastname: "string" },
      outputSchemaJson: { contact_id: "string", status: "string", provider: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      approvalRulesJson: {},
      successCondition: "contact updated",
      failureConditionsJson: [],
      sourceEvidenceJson: ["hubspot"],
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

  delete process.env.HUBSPOT_TEST_TOKEN;
  await prisma.$disconnect();
});

describe("hubspot execution adapter", () => {
  it("updates a HubSpot contact through provider adapter", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName,
      agentName: "hubspot-agent",
      input: {
        email: "customer@example.com",
        firstname: "Ava",
        lastname: "Smith",
      },
    });

    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.execution_mode).toBe(ExecutionMode.api);
    expect(result.output.provider).toBe("hubspot");
    expect(result.output.contact_id).toBe("12345");
    expect(result.output.status).toBe("updated");
  });
});
