import { randomUUID } from "node:crypto";
import { CommandStatus, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { POST as simulateAutoSend } from "@/app/api/auto-send/simulate/route";

const prisma = new PrismaClient();

let organisationId = "";
let ownerUserId = "";
let viewerUserId = "";
let lowRiskCommandId = "";
let highRiskCommandId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Auto Send Org ${suffix}`,
      slug: `auto-send-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const owner = await prisma.user.create({
    data: {
      organisationId,
      email: `autosend-owner-${suffix}@example.com`,
      name: "AutoSend Owner",
      role: "owner",
    },
  });
  ownerUserId = owner.id;

  const viewer = await prisma.user.create({
    data: {
      organisationId,
      email: `autosend-viewer-${suffix}@example.com`,
      name: "AutoSend Viewer",
      role: "viewer",
    },
  });
  viewerUserId = viewer.id;

  const low = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: `auto_send_low_${suffix}`,
      description: "Low risk test",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { ok: "boolean" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "low",
      approvalRulesJson: null,
      successCondition: "ok",
      failureConditionsJson: [],
      sourceEvidenceJson: ["test"],
      status: CommandStatus.published,
    },
  });
  lowRiskCommandId = low.id;

  const high = await prisma.actionCommand.create({
    data: {
      organisationId,
      name: `auto_send_high_${suffix}`,
      description: "High risk test",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { ok: "boolean" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "high",
      approvalRulesJson: null,
      successCondition: "ok",
      failureConditionsJson: [],
      sourceEvidenceJson: ["test"],
      status: CommandStatus.published,
    },
  });
  highRiskCommandId = high.id;

  await prisma.approvalPolicy.create({
    data: {
      organisationId,
      name: "Auto-send Default Policy",
      status: "active",
      isDefault: true,
      policyJson: {
        thresholds: { amount_greater_than: 200 },
        scenario_gates: ["refund_flow"],
        auto_send: {
          confidence_threshold: 0.9,
          scenario_allowlist: ["refund_flow"],
          zero_tolerance_violations: ["policy_violation"],
          bypass_prevention_enabled: true,
        },
      },
    },
  });
});

beforeEach(() => {
  vi.mocked(getDevContext).mockResolvedValue({
    organisationId,
    userId: ownerUserId,
    user: {
      id: ownerUserId,
      email: "owner@example.com",
      name: "Owner",
      role: "owner",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.sendEvent.deleteMany({ where: { organisationId } });
  await prisma.approvalPolicy.deleteMany({ where: { organisationId } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("auto-send simulate API", () => {
  it("allows auto-send when guardrails pass", async () => {
    const res = await simulateAutoSend(
      new Request("http://localhost/api/auto-send/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          command_id: lowRiskCommandId,
          scenario: "refund_flow",
          confidence: 0.95,
          violations: [],
          input: { amount: 100 },
          bypass_request: false,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision.status).toBe("allow_auto_send");
    expect(Array.isArray(body.decision.blockers)).toBe(true);
    expect(body.decision.blockers).toHaveLength(0);
    expect(typeof body.context.send_event_id).toBe("string");
    const sendEvent = await prisma.sendEvent.findUnique({
      where: { id: body.context.send_event_id as string },
    });
    expect(sendEvent).not.toBeNull();
    expect(sendEvent?.deliveryState).toBe("simulated_not_dispatched");
  });

  it("blocks auto-send with explicit reasons", async () => {
    const res = await simulateAutoSend(
      new Request("http://localhost/api/auto-send/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          command_id: highRiskCommandId,
          scenario: "other_flow",
          confidence: 0.5,
          violations: ["policy_violation"],
          input: { amount: 300 },
          bypass_request: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision.status).toBe("require_human_approval");
    const codes = body.decision.blockers.map((item: { code: string }) => item.code);
    expect(codes).toContain("high_risk_mandatory_human_approval");
    expect(codes).toContain("scenario_not_allowlisted");
    expect(codes).toContain("confidence_below_threshold");
    expect(codes).toContain("zero_tolerance_violation");
    expect(codes).toContain("amount_requires_approval_threshold");
    expect(codes).toContain("bypass_prevention_enforced");
    expect(typeof body.context.send_event_id).toBe("string");
  });

  it("blocks viewer role", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId,
      userId: viewerUserId,
      user: {
        id: viewerUserId,
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const res = await simulateAutoSend(
      new Request("http://localhost/api/auto-send/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          command_id: lowRiskCommandId,
          scenario: "refund_flow",
          confidence: 0.95,
          violations: [],
          input: { amount: 100 },
        }),
      }),
    );

    expect(res.status).toBe(403);
  });
});
