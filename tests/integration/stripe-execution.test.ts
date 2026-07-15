import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { PrismaClient, ExecutionMode, ExecutionStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCommandByName } from "@/lib/execution";

const prisma = new PrismaClient();

let organisationId = "";
let userId = "";
let stripeSuccessCommandName = "";
let stripeRetrieveCommandName = "";
let stripeMissingCredsCommandName = "";
let server: ReturnType<typeof createServer> | null = null;
let stripeBaseUrl = "";

beforeAll(async () => {
  const suffix = Date.now().toString().slice(-6);

  const org = await prisma.organisation.create({
    data: { name: `Stripe Exec Org ${suffix}`, slug: `stripe-exec-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `stripe-exec-${suffix}@example.com`,
      name: "Stripe Exec Tester",
      role: "owner",
    },
  });
  userId = user.id;

  process.env.STRIPE_TEST_KEY = "sk_test_local_123";

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/v1/refunds/re_local_123") {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${process.env.STRIPE_TEST_KEY}`) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "re_local_123",
          status: "succeeded",
        }),
      );
      return;
    }

    if (req.method !== "POST" || req.url !== "/v1/refunds") {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.STRIPE_TEST_KEY}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const form = new URLSearchParams(body);
      if (!form.get("payment_intent") && !form.get("charge")) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "missing_source" }));
        return;
      }

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "re_local_123",
          status: "succeeded",
        }),
      );
    });
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  stripeBaseUrl = `http://127.0.0.1:${address.port}`;

  const stripeApp = await prisma.app.create({
    data: {
      organisationId,
      name: `Stripe Connector ${suffix}`,
      type: "api_schema",
      baseUrl: stripeBaseUrl,
      authMethod: "bearer",
      executionMode: "api",
      connectionStatus: "connected",
      metadataJson: {
        provider_key: "stripe",
        auth_env_key: "STRIPE_TEST_KEY",
      },
    },
  });

  stripeSuccessCommandName = `issue_refund_stripe_success_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      appId: stripeApp.id,
      name: stripeSuccessCommandName,
      description: "Stripe refund command",
      inputSchemaJson: { payment_intent_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "medium",
      approvalRulesJson: { amount_greater_than: 200 },
      successCondition: "refund created",
      failureConditionsJson: [],
      sourceEvidenceJson: ["stripe"],
      status: "published",
    },
  });

  stripeRetrieveCommandName = `lookup_refund_stripe_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      appId: stripeApp.id,
      name: stripeRetrieveCommandName,
      description: "Stripe retrieve refund command",
      inputSchemaJson: { refund_id: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", provider: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      approvalRulesJson: {},
      successCondition: "refund lookup succeeded",
      failureConditionsJson: [],
      sourceEvidenceJson: ["stripe"],
      status: "published",
    },
  });

  await prisma.app.update({
    where: { id: stripeApp.id },
    data: {
      metadataJson: {
        provider_key: "stripe",
        auth_env_key: "STRIPE_TEST_KEY",
        provider_operation: "create_refund",
      },
    },
  });

  const stripeMissingCredsApp = await prisma.app.create({
    data: {
      organisationId,
      name: `Stripe Missing Creds ${suffix}`,
      type: "api_schema",
      baseUrl: stripeBaseUrl,
      authMethod: "bearer",
      executionMode: "api",
      connectionStatus: "not_connected",
      metadataJson: {
        provider_key: "stripe",
        auth_env_key: "DOES_NOT_EXIST",
      },
    },
  });

  stripeMissingCredsCommandName = `issue_refund_stripe_missing_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      appId: stripeMissingCredsApp.id,
      name: stripeMissingCredsCommandName,
      description: "Stripe refund command missing creds",
      inputSchemaJson: { payment_intent_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "medium",
      approvalRulesJson: { amount_greater_than: 200 },
      successCondition: "refund created",
      failureConditionsJson: [],
      sourceEvidenceJson: ["stripe"],
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

  delete process.env.STRIPE_TEST_KEY;
  await prisma.$disconnect();
});

describe("stripe execution adapter", () => {
  it("executes refund through Stripe provider with API mode", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName: stripeSuccessCommandName,
      agentName: "stripe-agent",
      input: {
        payment_intent_id: "pi_local_123",
        amount: 25,
        reason: "duplicate billing",
      },
    });

    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.execution_mode).toBe(ExecutionMode.api);
    expect(result.output.refund_id).toBe("re_local_123");
    expect(result.output.provider).toBe("stripe");

    const execution = await prisma.commandExecution.findUniqueOrThrow({ where: { id: result.execution_id } });
    expect(execution.status).toBe(ExecutionStatus.succeeded);
    expect(execution.executionMode).toBe(ExecutionMode.api);
  });

  it("returns real credential error when Stripe key env is missing", async () => {
    const result = await runCommandByName({
      organisationId,
      userId,
      commandName: stripeMissingCredsCommandName,
      agentName: "stripe-agent",
      input: {
        payment_intent_id: "pi_local_456",
        amount: 20,
        reason: "duplicate billing",
      },
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error.toLowerCase()).toContain("credential error");
  });

  it("supports Stripe retrieve_refund operation", async () => {
    const sourceCommand = await prisma.actionCommand.findFirstOrThrow({
      where: { organisationId, name: stripeSuccessCommandName },
      select: { appId: true },
    });
    await prisma.app.update({
      where: { id: sourceCommand.appId ?? "" },
      data: {
        metadataJson: {
          provider_key: "stripe",
          auth_env_key: "STRIPE_TEST_KEY",
          provider_operation: "retrieve_refund",
        },
      },
    });

    const result = await runCommandByName({
      organisationId,
      userId,
      commandName: stripeRetrieveCommandName,
      agentName: "stripe-agent",
      input: { refund_id: "re_local_123" },
    });

    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.execution_mode).toBe(ExecutionMode.api);
    expect(result.output.refund_id).toBe("re_local_123");
    expect(result.output.provider).toBe("stripe");

    await prisma.app.update({
      where: { id: sourceCommand.appId ?? "" },
      data: {
        metadataJson: {
          provider_key: "stripe",
          auth_env_key: "STRIPE_TEST_KEY",
          provider_operation: "create_refund",
        },
      },
    });
  });
});
