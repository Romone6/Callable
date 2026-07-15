import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { GET as getOpenApi } from "@/app/api/v1/openapi/route";
import { GET as getMcpAudit } from "@/app/api/mcp/audit/route";
import { POST as mcpPost } from "@/app/api/mcp/route";

const prisma = new PrismaClient();

let organisationId = "";
let apiKeyId = "";
let apiToken = "";

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found. Run prisma seed before tests.");
  }

  organisationId = user.organisationId;
  const commandName = "issue_refund_from_ticket";
  const existingCommand = await prisma.actionCommand.findFirst({
    where: {
      organisationId,
      name: commandName,
      status: "published",
    },
  });

  if (!existingCommand) {
    await prisma.actionCommand.create({
      data: {
        organisationId,
        name: commandName,
        description: "Issues a refund",
        inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
        outputSchemaJson: { refund_id: "string", status: "string" },
        executionStrategy: "api_first_browser_fallback",
        riskLevel: "medium",
        approvalRulesJson: { amount_greater_than: 200 },
        successCondition: "ok",
        failureConditionsJson: [],
        sourceEvidenceJson: ["test"],
        status: "published",
      },
    });
  }

  apiToken = `vk_test_${randomUUID().replace(/-/g, "")}`;
  const apiKey = await prisma.apiKey.create({
    data: {
      organisationId,
      name: `developer-platform-ga-${Date.now()}`,
      keyHash: createHash("sha256").update(apiToken).digest("hex"),
      scopesJson: ["commands:read", "commands:run", "executions:read", "audit:read"],
    },
  });
  apiKeyId = apiKey.id;
});

afterAll(async () => {
  if (apiKeyId) {
    await prisma.apiKey.deleteMany({
      where: {
        id: apiKeyId,
      },
    });
  }
  await prisma.$disconnect();
});

describe("developer platform ga routes", () => {
  it("serves versioned OpenAPI contract with MCP audit path", async () => {
    const res = await getOpenApi(new Request("http://localhost:3100/api/v1/openapi"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body.info?.version).toBe("v1");
    expect(body.paths?.["/api/mcp/audit"]).toBeDefined();
    expect(body.paths?.["/api/audit/events"]).toBeDefined();
    expect(body.paths?.["/api/send-events/{id}"]).toBeDefined();
    expect(body.paths?.["/api/auto-send/simulate"]).toBeDefined();
    expect(body.components?.securitySchemes?.bearerAuth?.scheme).toBe("bearer");
  });

  it("enforces API-key auth on MCP audit endpoint", async () => {
    const res = await getMcpAudit(new Request("http://localhost:3100/api/mcp/audit"));
    expect([401, 403]).toContain(res.status);
    const body = await res.json();
    expect(["unauthorized", "forbidden"]).toContain(body.error?.code);
  });

  it("logs MCP invocation events and returns filtered audit view", async () => {
    const invokeRes = await mcpPost(
      new Request("http://localhost:3100/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          tool: "list_commands",
          args: {},
        }),
      }),
    );
    expect(invokeRes.status).toBe(200);

    const auditRes = await getMcpAudit(
      new Request("http://localhost:3100/api/mcp/audit?tool=list_commands&outcome=succeeded&limit=20", {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }),
    );
    expect(auditRes.status).toBe(200);
    const auditBody = await auditRes.json();
    expect(Array.isArray(auditBody.events)).toBe(true);
    expect(auditBody.events.some((event: { tool: string; outcome: string; actor_id: string }) =>
      event.tool === "list_commands" && event.outcome === "succeeded" && event.actor_id === apiKeyId)).toBe(true);
  });
});
