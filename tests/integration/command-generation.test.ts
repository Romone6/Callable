import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as generateCommand } from "@/app/api/discovery/candidates/[id]/generate-command/route";

const prisma = new PrismaClient();
let candidateId = "";

beforeAll(async () => {
  const user = await prisma.user.findFirstOrThrow();
  const candidate = await prisma.workflowCandidate.create({
    data: {
      organisationId: user.organisationId,
      name: `issue_refund_from_ticket_${Date.now()}`,
      description: "Issue refund from support ticket",
      confidence: 0.9,
      riskLevel: "medium",
      requiredInputsJson: ["ticket_id", "amount", "reason"],
      expectedOutputsJson: ["refund_id", "status", "ticket_status"],
      approvalConditionsJson: ["amount > 200"],
      sourceEvidenceJson: ["refund_sop.txt"],
      status: "needs_review",
    },
  });
  candidateId = candidate.id;
});

describe("command generation", () => {
  it("creates command from candidate", async () => {
    const res = await generateCommand(new Request("http://localhost"), { params: Promise.resolve({ id: candidateId }) });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.command.name).toContain("issue_refund_from_ticket");
  });
});
