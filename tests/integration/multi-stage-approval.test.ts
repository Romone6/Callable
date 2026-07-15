import { randomUUID } from "node:crypto";
import { ApprovalStatus, ExecutionStatus, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { finalizeApprovedExecution, rejectApproval, runCommandByName } from "@/lib/execution";

const prisma = new PrismaClient();

let organisationId = "";
let requesterUserId = "";
let reviewerUserId = "";
let adminUserId = "";
let commandName = "";
let ticketCode = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);

  const org = await prisma.organisation.create({
    data: { name: `Multi Stage Org ${suffix}`, slug: `multi-stage-org-${suffix}`, plan: "test" },
  });
  organisationId = org.id;

  const requester = await prisma.user.create({
    data: {
      organisationId,
      email: `requester-${suffix}@example.com`,
      name: "Requester",
      role: "operator",
    },
  });
  requesterUserId = requester.id;

  const reviewer = await prisma.user.create({
    data: {
      organisationId,
      email: `reviewer-${suffix}@example.com`,
      name: "Reviewer",
      role: "reviewer",
    },
  });
  reviewerUserId = reviewer.id;

  const admin = await prisma.user.create({
    data: {
      organisationId,
      email: `admin-${suffix}@example.com`,
      name: "Admin",
      role: "admin",
    },
  });
  adminUserId = admin.id;

  const customer = await prisma.customer.create({
    data: {
      organisationId,
      externalId: `EXT-MULTI-${suffix}`,
      email: `customer-${suffix}@example.com`,
      name: "Customer",
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      organisationId,
      customerId: customer.id,
      ticketCode: `TCK-MULTI-${suffix}`,
      subject: "High value refund",
      description: "Needs multi-stage review",
      status: "open",
      refundEligible: true,
    },
  });
  ticketCode = ticket.ticketCode;

  commandName = `issue_refund_multistage_${suffix}`;
  await prisma.actionCommand.create({
    data: {
      organisationId,
      name: commandName,
      description: "Issues refund with staged approvals",
      inputSchemaJson: { ticket_id: "string", amount: "number", reason: "string" },
      outputSchemaJson: { refund_id: "string", status: "string", ticket_status: "string" },
      executionStrategy: "api_first_browser_fallback",
      riskLevel: "high",
      approvalRulesJson: {
        amount_greater_than: 200,
        stages: [
          { name: "manager_review", required_role: "reviewer", amount_greater_than: 200 },
          { name: "finance_review", required_role: "admin", amount_greater_than: 1000 },
        ],
      },
      successCondition: "refund record created and ticket updated",
      failureConditionsJson: ["ticket not found", "refund ineligible"],
      sourceEvidenceJson: ["multi-stage-test"],
      status: "published",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.approval.deleteMany({ where: { organisationId } });
  await prisma.commandExecution.deleteMany({ where: { organisationId } });
  await prisma.commandStep.deleteMany({ where: { command: { organisationId } } });
  await prisma.actionCommand.deleteMany({ where: { organisationId } });
  await prisma.refund.deleteMany({ where: { organisationId } });
  await prisma.ticket.deleteMany({ where: { organisationId } });
  await prisma.customer.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("multi-stage approval routing", () => {
  it("creates staged approvals, enforces role checks, and advances to next stage", async () => {
    const runResult = await runCommandByName({
      organisationId,
      userId: requesterUserId,
      commandName,
      agentName: "workflow-agent",
      input: {
        ticket_id: ticketCode,
        amount: 1500,
        reason: "duplicate billing",
      },
    });

    expect(runResult.status).toBe("waiting_for_approval");

    const firstStage = await prisma.approval.findFirstOrThrow({
      where: { organisationId, executionId: runResult.execution_id, status: ApprovalStatus.pending, stageIndex: 0 },
    });
    expect(firstStage.requiredRole).toBe("reviewer");

    await expect(
      finalizeApprovedExecution({
        approvalId: firstStage.id,
        reviewerId: requesterUserId,
        reviewerRole: "operator",
      }),
    ).rejects.toThrow("Forbidden");

    const approvedStage = await finalizeApprovedExecution({
      approvalId: firstStage.id,
      reviewerId: reviewerUserId,
      reviewerRole: "reviewer",
    });

    expect((approvedStage as { status?: string }).status).toBe("waiting_for_approval");

    const secondStage = await prisma.approval.findFirstOrThrow({
      where: { organisationId, executionId: runResult.execution_id, status: ApprovalStatus.pending, stageIndex: 1 },
    });
    expect(secondStage.requiredRole).toBe("admin");

    await rejectApproval({
      approvalId: secondStage.id,
      reviewerId: adminUserId,
      reason: "finance policy rejected",
    });

    const execution = await prisma.commandExecution.findUniqueOrThrow({ where: { id: runResult.execution_id } });
    expect(execution.status).toBe(ExecutionStatus.failed);
    expect(execution.approvalStatus).toBe(ApprovalStatus.rejected);

    const approvals = await prisma.approval.findMany({
      where: { organisationId, executionId: runResult.execution_id },
      orderBy: { stageIndex: "asc" },
    });
    expect(approvals).toHaveLength(2);
    expect(approvals[0].status).toBe(ApprovalStatus.approved);
    expect(approvals[1].status).toBe(ApprovalStatus.rejected);
  });
});
