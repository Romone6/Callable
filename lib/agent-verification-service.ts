import { CommandStatus } from "@prisma/client";

import { getAgentVerificationStatus, shouldSendAgentVerificationEmail } from "@/lib/agent-verification";
import { getVerificationEmailConfig, sendAgentVerificationEmail } from "@/lib/agent-verification-email";
import { prisma } from "@/lib/db";

type AuditDetails = { tool?: unknown; outcome?: unknown };

function details(value: unknown): AuditDetails {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AuditDetails : {};
}

export async function getAgentVerificationRecords(organisationId: string) {
  const [keys, commands, audits, sentEmails] = await Promise.all([
    prisma.apiKey.findMany({ where: { organisationId, revokedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.actionCommand.findMany({ where: { organisationId, status: CommandStatus.published }, select: { name: true, description: true, riskLevel: true, updatedAt: true } }),
    prisma.auditLog.findMany({ where: { organisationId, eventType: "mcp_tool_invocation" }, orderBy: { createdAt: "desc" }, take: 1000 }),
    prisma.auditLog.findMany({ where: { organisationId, eventType: "agent_verification_email_sent" }, orderBy: { createdAt: "desc" }, take: 1000 }),
  ]);

  return keys.map((key) => {
    const invoked = audits.filter((audit) => audit.actorId === key.id && details(audit.detailsJson).outcome === "succeeded");
    const listedAt = invoked.find((audit) => details(audit.detailsJson).tool === "list_commands")?.createdAt ?? null;
    const dryRunAt = invoked.find((audit) => details(audit.detailsJson).tool === "dry_run_command")?.createdAt ?? null;
    const latestCommandChangeAt = commands.reduce<Date | null>((latest, command) => !latest || command.updatedAt > latest ? command.updatedAt : latest, null);
    const status = getAgentVerificationStatus({ commandCount: commands.length, listedAt, dryRunAt, latestCommandChangeAt });
    const emailSent = sentEmails.some((audit) => audit.actorId === key.id);
    return {
      apiKeyId: key.id,
      agentName: key.name,
      status,
      listedAt,
      dryRunAt,
      emailSent,
      commands: commands.map((command) => ({ name: command.name, description: command.description, riskLevel: command.riskLevel })),
    };
  });
}

export async function notifyVerifiedAgent(input: { organisationId: string; apiKeyId: string; agentName: string }) {
  const record = (await getAgentVerificationRecords(input.organisationId)).find((candidate) => candidate.apiKeyId === input.apiKeyId);
  if (!record || !shouldSendAgentVerificationEmail(record.status, record.emailSent)) return { status: "not_ready" as const };

  const recipient = await prisma.user.findFirst({ where: { organisationId: input.organisationId, role: { in: ["owner", "admin"] } }, orderBy: { createdAt: "asc" }, select: { email: true } });
  if (!recipient) return { status: "unavailable" as const, reason: "No owner or admin email is provisioned for this workspace." };

  const result = await sendAgentVerificationEmail({
    recipient: recipient.email,
    agentName: input.agentName,
    commands: record.commands,
    completedAt: record.dryRunAt ?? new Date(),
    idempotencyKey: `agent-verification-${input.apiKeyId}`,
  });
  if (result.status === "sent") {
    await prisma.auditLog.create({ data: { organisationId: input.organisationId, eventType: "agent_verification_email_sent", actorType: "system", actorId: input.apiKeyId, detailsJson: { provider_message_id: result.providerId, recipient: recipient.email, command_count: record.commands.length } } });
  }
  return result;
}

export function isVerificationEmailConfigured() {
  return Boolean(getVerificationEmailConfig(process.env));
}
