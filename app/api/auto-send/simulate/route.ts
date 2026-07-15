import { getDevContext } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { simulateAutoSendDecision } from "@/lib/auto-send";
import { resolveEffectiveApprovalRules } from "@/lib/approval-policies";
import { resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission, requireRole } from "@/lib/permissions";
import { autoSendSimulateSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "approvals:read");
    requirePermission(user.role, "executions:manage");
    requireRole(user.role, ["owner", "admin", "operator"]);

    const parsed = autoSendSimulateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid auto-send simulation payload", parsed.error.flatten());
    }

    const command = await prisma.actionCommand.findFirst({
      where: {
        organisationId,
        id: parsed.data.command_id,
      },
      select: {
        id: true,
        name: true,
        riskLevel: true,
        approvalRulesJson: true,
        app: {
          select: {
            type: true,
            baseUrl: true,
            metadataJson: true,
          },
        },
      },
    });
    if (!command) {
      return notFound("Command not found");
    }

    const policy = parsed.data.approval_policy_id
      ? await prisma.approvalPolicy.findFirst({
          where: {
            organisationId,
            id: parsed.data.approval_policy_id,
            status: "active",
          },
        })
      : await prisma.approvalPolicy.findFirst({
          where: {
            organisationId,
            status: "active",
            isDefault: true,
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        });

    if (parsed.data.approval_policy_id && !policy) {
      return notFound("Approval policy not found or not active");
    }

    const effectiveApprovalRules = await resolveEffectiveApprovalRules(organisationId, command.approvalRulesJson);
    const decision = simulateAutoSendDecision({
      commandRiskLevel: command.riskLevel,
      effectiveApprovalRules,
      policyJson: policy?.policyJson ?? null,
      scenario: parsed.data.scenario,
      confidence: parsed.data.confidence,
      violations: parsed.data.violations,
      input: parsed.data.input as Record<string, unknown> | undefined,
      bypassRequest: parsed.data.bypass_request,
    });

    const connectorTarget = command.app
      ? {
          provider_key: resolveProviderKeyFromMetadata(command.app.type, command.app.metadataJson),
          base_url: command.app.baseUrl,
        }
      : {
          provider_key: "internal_acme_support_admin",
          base_url: null,
        };

    const sendEvent = await prisma.sendEvent.create({
      data: {
        organisationId,
        commandId: command.id,
        approvalPolicyId: policy?.id ?? null,
        source: "auto_send_simulation",
        decisionStatus: decision.status,
        decisionSnapshotJson: {
          scenario: parsed.data.scenario,
          confidence: parsed.data.confidence,
          violations: parsed.data.violations,
          bypass_request: parsed.data.bypass_request,
          decision: decision,
        },
        reviewerStateJson: {
          reviewer_required: decision.status !== "allow_auto_send",
          reviewer_role: decision.status !== "allow_auto_send" ? "admin_or_owner" : null,
        },
        riskStateJson: {
          command_risk_level: command.riskLevel,
          blockers: decision.blockers,
        },
        connectorTargetJson: connectorTarget,
        deliveryState: "simulated_not_dispatched",
        createdBy: userId,
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "auto_send_simulated",
      actorType: "user",
      actorId: userId,
      commandId: command.id,
      details: {
        scenario: parsed.data.scenario,
        confidence: parsed.data.confidence,
        violations: parsed.data.violations,
        decision_status: decision.status,
        blockers: decision.blockers,
        approval_policy_id: policy?.id ?? null,
        send_event_id: sendEvent.id,
      },
    });

    return ok({
      decision: {
        status: decision.status,
        blockers: decision.blockers,
        guardrails: decision.guardrails,
      },
      context: {
        command_id: command.id,
        command_name: command.name,
        command_risk_level: command.riskLevel,
        approval_policy_id: policy?.id ?? null,
        approval_policy_name: policy?.name ?? null,
        send_event_id: sendEvent.id,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
