import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as mcpPost } from "@/app/api/mcp/route";

const prisma = new PrismaClient();
let apiKey = "";

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found. Run prisma seed before tests.");
  }

  const exists = await prisma.actionCommand.findFirst({
    where: { organisationId: user.organisationId, name: "issue_refund_from_ticket", status: "published" },
  });

  if (!exists) {
    await prisma.actionCommand.create({
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
        sourceEvidenceJson: ["test"],
        status: "published",
      },
    });
  }

  apiKey = `vk_test_${Date.now()}`;
  await prisma.apiKey.create({
    data: {
      organisationId: user.organisationId,
      name: "mcp-test-key",
      keyHash: createHash("sha256").update(apiKey).digest("hex"),
      scopesJson: ["commands:read", "commands:run", "executions:read", "audit:read"],
    },
  });
});

describe("mcp route", () => {
  it("returns real commands from database", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ tool: "list_commands", args: {} }),
    });

    const res = await mcpPost(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.result)).toBe(true);
    expect(body.result.length).toBeGreaterThan(0);
  });
});
