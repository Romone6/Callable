import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test("full lifecycle: app -> source -> discovery -> command -> run -> approval -> drift -> audit", async ({ request, page }) => {
  const user = await prisma.user.findFirstOrThrow();
  const suffix = Date.now().toString().slice(-6);

  const appCreate = await request.post("/api/apps", {
    data: {
      name: `Acme Target ${suffix}`,
      type: "internal_web_app",
      base_url: "http://localhost:3100",
      auth_method: "none",
      execution_mode: "hybrid",
    },
  });
  expect(appCreate.ok()).toBeTruthy();
  const appBody = await appCreate.json();
  const appId = appBody.app.id as string;

  const sourceCreate = await request.post("/api/discovery-sources/text", {
    data: {
      app_id: appId,
      type: "manual_process_text",
      name: `refund-evidence-${suffix}`,
      raw_text: "Issue refund from ticket when duplicate billing is confirmed. Inputs: ticket_id, amount, reason.",
    },
  });
  expect(sourceCreate.ok()).toBeTruthy();
  const sourceBody = await sourceCreate.json();
  const sourceId = sourceBody.source.id as string;

  const discoveryRun = await request.post("/api/discovery/run", {
    data: { app_id: appId, source_ids: [sourceId] },
  });

  let candidateId: string;
  if (discoveryRun.ok()) {
    const body = await discoveryRun.json();
    candidateId = body.candidates?.[0]?.id as string;
    if (!candidateId) {
      const fallbackCandidate = await prisma.workflowCandidate.create({
        data: {
          organisationId: user.organisationId,
          appId,
          name: `issue_refund_from_ticket_${suffix}`,
          description: "Issues refund from ticket",
          confidence: 0.82,
          riskLevel: "medium",
          requiredInputsJson: ["ticket_id", "amount", "reason"],
          expectedOutputsJson: ["refund_id", "status", "ticket_status"],
          approvalConditionsJson: ["amount > 200"],
          sourceEvidenceJson: [`refund-evidence-${suffix}`],
          status: "needs_review",
        },
      });
      candidateId = fallbackCandidate.id;
    }
  } else {
    const errorPayload = await discoveryRun.json();
    const errorText = JSON.stringify(errorPayload).toLowerCase();
    expect(errorText.includes("openai_api_key") || errorText.includes("api key")).toBeTruthy();

    const fallbackCandidate = await prisma.workflowCandidate.create({
      data: {
        organisationId: user.organisationId,
        appId,
        name: `issue_refund_from_ticket_${suffix}`,
        description: "Issues refund from ticket",
        confidence: 0.82,
        riskLevel: "medium",
        requiredInputsJson: ["ticket_id", "amount", "reason"],
        expectedOutputsJson: ["refund_id", "status", "ticket_status"],
        approvalConditionsJson: ["amount > 200"],
        sourceEvidenceJson: [`refund-evidence-${suffix}`],
        status: "needs_review",
      },
    });
    candidateId = fallbackCandidate.id;
  }

  const accept = await request.post(`/api/discovery/candidates/${candidateId}/accept`);
  expect(accept.ok()).toBeTruthy();

  const generate = await request.post(`/api/discovery/candidates/${candidateId}/generate-command`);
  expect(generate.status()).toBe(201);
  const generatedBody = await generate.json();
  const commandId = generatedBody.command.id as string;

  const publish = await request.post(`/api/commands/${commandId}/publish`);
  expect(publish.ok()).toBeTruthy();

  const customer = await prisma.customer.create({
    data: {
      organisationId: user.organisationId,
      externalId: `FULL-${suffix}`,
      email: `full-${suffix}@example.com`,
      name: "Full Flow Customer",
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      organisationId: user.organisationId,
      customerId: customer.id,
      ticketCode: `TCK-FULL-${suffix}`,
      subject: "Full flow refund",
      description: "full lifecycle",
      status: "open",
      refundEligible: true,
    },
  });

  const run = await request.post(`/api/commands/${commandId}/run`, {
    data: {
      agent_name: "full-flow-agent",
      input: {
        ticket_id: ticket.ticketCode,
        amount: 450,
        reason: "duplicate billing",
      },
    },
  });

  expect(run.ok()).toBeTruthy();
  const runBody = await run.json();
  expect(runBody.status).toBe("waiting_for_approval");

  const approval = await prisma.approval.findFirstOrThrow({
    where: {
      organisationId: user.organisationId,
      executionId: runBody.execution_id,
      status: "pending",
    },
  });

  const approve = await request.post(`/api/approvals/${approval.id}/approve`);
  expect(approve.ok()).toBeTruthy();

  const executionRes = await request.get(`/api/executions/${runBody.execution_id}`);
  expect(executionRes.ok()).toBeTruthy();
  const executionBody = await executionRes.json();
  expect(executionBody.execution.status).toBe("succeeded");

  const drift = await request.post(`/api/drift/check/${commandId}`);
  expect(drift.ok()).toBeTruthy();

  const auditsRes = await request.get("/api/audit-logs");
  expect(auditsRes.ok()).toBeTruthy();
  const auditsBody = await auditsRes.json();
  const auditJson = JSON.stringify(auditsBody).toLowerCase();
  expect(auditJson).toContain("command_published");
  expect(auditJson).toContain("approval_requested");

  const failedRun = await request.post(`/api/commands/${commandId}/run`, {
    data: {
      agent_name: "full-flow-agent",
      input: {
        ticket_id: ticket.ticketCode,
        amount: 40,
      },
    },
  });
  expect(failedRun.ok()).toBeTruthy();
  const failedBody = await failedRun.json();
  expect(failedBody.status).toBe("failed");
  expect(String(failedBody.error).toLowerCase()).toContain("validation");

  await page.goto("/settings");
  await expect(page.getByText("Persisted settings are Unavailable in this version.")).toBeVisible();
});
