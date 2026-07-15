import { randomUUID } from "node:crypto";
import { PrismaClient, ApprovalStatus, ExecutionStatus } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { GET as getRetention, PATCH as patchRetention } from "@/app/api/compliance/retention/route";
import { GET as listComplianceExports, POST as createComplianceExport } from "@/app/api/compliance/exports/route";
import { POST as runPurge } from "@/app/api/compliance/purge/route";
import { GET as downloadComplianceExport } from "@/app/api/compliance/exports/[id]/download/route";
import { GET as listSigningKeys, POST as rotateSigningKey } from "@/app/api/compliance/export-signing-keys/route";

const prisma = new PrismaClient();

let organisationId = "";
let userId = "";
let commandId = "";
let executionId = "";
let approvalId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Compliance Org ${suffix}`,
      slug: `compliance-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `compliance-${suffix}@example.com`,
      name: "Compliance Tester",
      role: "owner",
    },
  });
  userId = user.id;

  const oldDate = new Date();
  oldDate.setUTCDate(oldDate.getUTCDate() - 120);

  const command = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: `compliance_command_${suffix}`,
      description: "compliance test command",
      inputSchemaJson: { ticket_id: "string" },
      outputSchemaJson: { status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      successCondition: "ok",
      failureConditionsJson: [],
      sourceEvidenceJson: ["compliance"],
      status: "published",
    },
  });
  commandId = command.id;

  const execution = await prisma.commandExecution.create({
    data: {
      organisationId,
      commandId,
      agentName: "compliance-agent",
      userId,
      inputJson: { ticket_id: "TCK-OLD" },
      outputJson: { status: "done" },
      status: ExecutionStatus.succeeded,
      executionMode: "api",
      startedAt: oldDate,
      completedAt: oldDate,
      createdAt: oldDate,
    },
  });
  executionId = execution.id;

  const approval = await prisma.approval.create({
    data: {
      organisationId,
      executionId,
      commandId,
      requestedByAgent: "compliance-agent",
      reviewerId: userId,
      status: ApprovalStatus.approved,
      reason: "approved",
      createdAt: oldDate,
      resolvedAt: oldDate,
    },
  });
  approvalId = approval.id;

  await prisma.auditLog.create({
    data: {
      organisationId,
      eventType: "compliance_seed_event",
      actorType: "user",
      actorId: userId,
      commandId,
      executionId,
      detailsJson: { seeded: true },
      createdAt: oldDate,
    },
  });
});

beforeEach(() => {
  vi.mocked(getDevContext).mockResolvedValue({
    organisationId,
    userId,
    user: {
      id: userId,
      email: "compliance@example.com",
      name: "Compliance Tester",
      role: "owner",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.complianceExport.deleteMany({ where: { organisationId } });
  await prisma.exportSigningKey.deleteMany({ where: { organisationId } });
  await prisma.approval.deleteMany({ where: { organisationId } });
  await prisma.commandExecution.deleteMany({ where: { organisationId } });
  await prisma.commandStep.deleteMany({ where: { command: { organisationId } } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.retentionPolicy.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("compliance routes", () => {
  it("returns and updates retention policy", async () => {
    const getRes = await getRetention();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.policy.audit_log_days).toBe(90);

    const updateRes = await patchRetention(
      new Request("http://localhost/api/compliance/retention", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audit_log_days: 30,
          approval_days: 30,
          execution_days: 30,
        }),
      }),
    );
    expect(updateRes.status).toBe(200);

    const updateBody = await updateRes.json();
    expect(updateBody.policy.audit_log_days).toBe(30);
  });

  it("creates signed export artifacts and supports download", async () => {
    const jsonRes = await createComplianceExport(
      new Request("http://localhost/api/compliance/exports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resource: "audit_logs", format: "json", limit: 100 }),
      }),
    );
    expect(jsonRes.status).toBe(201);
    const jsonBody = await jsonRes.json();
    expect(jsonBody.export.resource).toBe("audit_logs");
    expect(typeof jsonBody.export.signature).toBe("string");
    expect(typeof jsonBody.export.download_url).toBe("string");

    const csvRes = await createComplianceExport(
      new Request("http://localhost/api/compliance/exports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resource: "approvals", format: "csv", limit: 100 }),
      }),
    );
    expect(csvRes.status).toBe(201);
    const csvBody = await csvRes.json();
    expect(csvBody.export.resource).toBe("approvals");

    const listRes = await listComplianceExports(new Request("http://localhost/api/compliance/exports"));
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.exports)).toBe(true);
    expect(listBody.exports.length).toBeGreaterThan(0);

    const downloadRes = await downloadComplianceExport(new Request("http://localhost/api/compliance/exports/x/download"), {
      params: Promise.resolve({ id: csvBody.export.id }),
    });
    expect(downloadRes.status).toBe(200);
    const downloaded = await downloadRes.text();
    expect(downloaded.includes("id")).toBe(true);
  });

  it("supports export signing key rotation", async () => {
    const beforeRes = await listSigningKeys();
    expect(beforeRes.status).toBe(200);
    const beforeBody = await beforeRes.json();
    const beforeCount = beforeBody.keys.length;

    const rotateRes = await rotateSigningKey();
    expect(rotateRes.status).toBe(201);

    const afterRes = await listSigningKeys();
    expect(afterRes.status).toBe(200);
    const afterBody = await afterRes.json();
    expect(afterBody.keys.length).toBeGreaterThanOrEqual(beforeCount);
    expect(afterBody.keys[0].isActive).toBe(true);
  });

  it("supports purge dry-run and execute paths with audit trace", async () => {
    await patchRetention(
      new Request("http://localhost/api/compliance/retention", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audit_log_days: 30,
          approval_days: 30,
          execution_days: 30,
        }),
      }),
    );

    const dryRunRes = await runPurge(
      new Request("http://localhost/api/compliance/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dry_run: true, resource: "all" }),
      }),
    );

    expect(dryRunRes.status).toBe(200);
    const dryRunBody = await dryRunRes.json();
    expect(dryRunBody.purge_counts.audit_logs).toBeGreaterThan(0);
    expect(dryRunBody.purge_counts.approvals).toBeGreaterThan(0);
    expect(dryRunBody.purge_counts.executions).toBeGreaterThan(0);

    const runRes = await runPurge(
      new Request("http://localhost/api/compliance/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dry_run: false, resource: "all" }),
      }),
    );

    expect(runRes.status).toBe(200);

    const execution = await prisma.commandExecution.findUnique({ where: { id: executionId } });
    const approval = await prisma.approval.findUnique({ where: { id: approvalId } });

    expect(execution).toBeNull();
    expect(approval).toBeNull();
  });
});
