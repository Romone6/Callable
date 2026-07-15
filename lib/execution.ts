import { chromium } from "playwright";
import { ApprovalStatus, CommandStatus, ExecutionMode, ExecutionStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";
import { resolveEffectiveApprovalRules } from "@/lib/approval-policies";
import { asMetadataRecord, metadataString, resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";
import { resolveCredentialValue } from "@/lib/connector-credentials";

type CommandInput = {
  ticket_id?: string;
  amount?: number;
  reason?: string;
  payment_intent_id?: string;
  charge_id?: string;
  refund_id?: string;
  status?: string;
  priority?: string;
  comment?: string;
  tags?: string[];
  contact_id?: string;
  email?: string;
  properties?: Record<string, unknown>;
  firstname?: string;
  lastname?: string;
  phone?: string;
  lifecyclestage?: string;
  company?: string;
  [key: string]: unknown;
};

type ExecutionTarget = {
  providerKey: string;
  baseUrl: string;
  supportsBrowserFallback: boolean;
  metadata: Record<string, unknown>;
};

type ProviderOperation =
  | "create_refund"
  | "retrieve_refund"
  | "update_ticket"
  | "update_contact";

type ApprovalStage = {
  name: string;
  required_role?: string;
  amount_greater_than?: number;
};

export type CommandRunResult =
  | {
      status: "succeeded";
      execution_id: string;
      output: Record<string, unknown>;
      execution_mode: ExecutionMode;
    }
  | {
      status: "waiting_for_approval";
      approval_required: true;
      reason: string;
      execution_id: string;
    }
  | {
      status: "failed";
      execution_id: string;
      error: string;
    };

function validateInput(inputSchema: Record<string, string>, input: Record<string, unknown>) {
  const issues: string[] = [];
  for (const [field, type] of Object.entries(inputSchema)) {
    const value = input[field];
    if (value === undefined || value === null) {
      issues.push(`Missing required field: ${field}`);
      continue;
    }

    if (type === "number" && typeof value !== "number") {
      issues.push(`Field ${field} must be number`);
    }

    if (type === "string" && typeof value !== "string") {
      issues.push(`Field ${field} must be string`);
    }
  }

  return issues;
}

function buildApprovalStages(
  approvalRules: Prisma.JsonValue | null | undefined,
  input: CommandInput,
): ApprovalStage[] {
  const rules =
    approvalRules && typeof approvalRules === "object" && !Array.isArray(approvalRules)
      ? (approvalRules as Record<string, unknown>)
      : {};

  const configuredStages = Array.isArray(rules.stages) ? rules.stages : [];
  const amount = typeof input.amount === "number" ? input.amount : null;

  const stages: ApprovalStage[] = [];
  configuredStages.forEach((stage, idx) => {
    if (!stage || typeof stage !== "object" || Array.isArray(stage)) return;
    const raw = stage as Record<string, unknown>;
    const threshold = typeof raw.amount_greater_than === "number" ? raw.amount_greater_than : undefined;
    if (threshold !== undefined && (amount === null || amount <= threshold)) {
      return;
    }

    const nextStage: ApprovalStage = {
      name: typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name.trim() : `stage_${idx + 1}`,
    };

    if (typeof raw.required_role === "string" && raw.required_role.trim().length > 0) {
      nextStage.required_role = raw.required_role;
    }
    if (typeof threshold === "number") {
      nextStage.amount_greater_than = threshold;
    }

    stages.push(nextStage);
  });

  if (stages.length > 0) return stages;

  return [{ name: "default_approval", required_role: "admin" }];
}

function canRoleApproveStage(reviewerRole: string, requiredRole: string | undefined) {
  if (!requiredRole) return true;
  const normalizedReviewer = reviewerRole.toLowerCase();
  const normalizedRequired = requiredRole.toLowerCase();
  if (normalizedReviewer === "owner") return true;
  return normalizedReviewer === normalizedRequired;
}

async function executeByApi(baseUrl: string, organisationId: string, payload: CommandInput) {
  const response = await fetch(`${baseUrl}/api/internal/acme/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": env.INTERNAL_EXECUTION_TOKEN,
      "x-organisation-id": organisationId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API execution failed: ${response.status} ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

function stripeReasonFromInput(reason: string | undefined) {
  if (!reason) return "requested_by_customer";
  const normalized = reason.toLowerCase();
  if (normalized.includes("fraud")) return "fraudulent";
  if (normalized.includes("duplicate")) return "duplicate";
  return "requested_by_customer";
}

async function executeStripeRefund(target: ExecutionTarget, organisationId: string, payload: CommandInput) {
  const authEnvKey = metadataString(target.metadata, "auth_env_key");
  const apiKey = resolveCredentialValue(target.metadata as Prisma.JsonValue, "auth_token", authEnvKey);
  if (!apiKey) {
    throw new Error(`Credential error: missing Stripe API key env '${authEnvKey ?? "auth_env_key"}'.`);
  }

  if (typeof payload.amount !== "number" || Number.isNaN(payload.amount) || payload.amount <= 0) {
    throw new Error("Stripe execution requires a positive numeric amount.");
  }

  const paymentIntentId = typeof payload.payment_intent_id === "string" ? payload.payment_intent_id : null;
  const chargeId = typeof payload.charge_id === "string" ? payload.charge_id : null;
  if (!paymentIntentId && !chargeId) {
    throw new Error("Stripe execution requires payment_intent_id or charge_id.");
  }

  const amountCents = Math.round(payload.amount * 100);
  if (amountCents <= 0) {
    throw new Error("Stripe execution amount must be greater than zero after cent conversion.");
  }

  const params = new URLSearchParams();
  params.set("amount", String(amountCents));
  params.set("reason", stripeReasonFromInput(typeof payload.reason === "string" ? payload.reason : undefined));
  if (paymentIntentId) params.set("payment_intent", paymentIntentId);
  if (!paymentIntentId && chargeId) params.set("charge", chargeId);

  const response = await fetch(`${target.baseUrl}/v1/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Stripe execution failed: ${response.status} ${body.slice(0, 320)}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const refundId = typeof json.id === "string" ? json.id : null;

  if (typeof payload.ticket_id === "string") {
    await prisma.ticket.updateMany({
      where: { organisationId, ticketCode: payload.ticket_id },
      data: { status: "refund_issued" },
    });
  }

  return {
    refund_id: refundId,
    status: String(json.status ?? "succeeded"),
    ticket_status: typeof payload.ticket_id === "string" ? "refund_issued" : "not_applicable",
    provider: "stripe",
  } satisfies Record<string, unknown>;
}

async function executeStripeRetrieveRefund(target: ExecutionTarget, payload: CommandInput) {
  const authEnvKey = metadataString(target.metadata, "auth_env_key");
  const apiKey = resolveCredentialValue(target.metadata as Prisma.JsonValue, "auth_token", authEnvKey);
  if (!apiKey) {
    throw new Error(`Credential error: missing Stripe API key env '${authEnvKey ?? "auth_env_key"}'.`);
  }

  const refundId = typeof payload.refund_id === "string" ? payload.refund_id : null;
  if (!refundId) {
    throw new Error("Stripe retrieve_refund execution requires refund_id.");
  }

  const response = await fetch(`${target.baseUrl}/v1/refunds/${refundId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Stripe refund lookup failed: ${response.status} ${body.slice(0, 320)}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return {
    refund_id: typeof json.id === "string" ? json.id : refundId,
    status: String(json.status ?? "unknown"),
    provider: "stripe",
  } satisfies Record<string, unknown>;
}

async function executeZendeskTicketUpdate(target: ExecutionTarget, payload: CommandInput) {
  const tokenEnv = metadataString(target.metadata, "auth_env_key");
  const emailEnv = metadataString(target.metadata, "username_env_key");
  const token = resolveCredentialValue(target.metadata as Prisma.JsonValue, "auth_token", tokenEnv);
  const email = resolveCredentialValue(target.metadata as Prisma.JsonValue, "username", emailEnv);
  if (!token || !email) {
    throw new Error(`Credential error: missing Zendesk env credentials '${tokenEnv ?? "auth_env_key"}' and '${emailEnv ?? "username_env_key"}'.`);
  }

  const ticketId = typeof payload.ticket_id === "string" ? payload.ticket_id : null;
  if (!ticketId) {
    throw new Error("Zendesk execution requires ticket_id.");
  }

  const ticketUpdate: Record<string, unknown> = {};
  if (typeof payload.status === "string") ticketUpdate.status = payload.status;
  if (typeof payload.priority === "string") ticketUpdate.priority = payload.priority;
  if (Array.isArray(payload.tags)) {
    ticketUpdate.tags = payload.tags.filter((tag): tag is string => typeof tag === "string");
  }
  if (typeof payload.comment === "string" && payload.comment.trim().length > 0) {
    ticketUpdate.comment = { body: payload.comment.trim(), public: true };
  } else if (typeof payload.reason === "string" && payload.reason.trim().length > 0) {
    ticketUpdate.comment = { body: payload.reason.trim(), public: true };
  }

  if (Object.keys(ticketUpdate).length === 0) {
    throw new Error("Zendesk execution requires at least one update field (status, priority, tags, comment, or reason).");
  }

  const basic = Buffer.from(`${email}/token:${token}`).toString("base64");
  const response = await fetch(`${target.baseUrl}/api/v2/tickets/${ticketId}.json`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticket: ticketUpdate }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zendesk execution failed: ${response.status} ${body.slice(0, 320)}`);
  }

  const json = (await response.json()) as { ticket?: { id?: number | string; status?: string } };
  return {
    ticket_id: String(json.ticket?.id ?? ticketId),
    status: json.ticket?.status ?? (typeof ticketUpdate.status === "string" ? ticketUpdate.status : "updated"),
    provider: "zendesk",
  } satisfies Record<string, unknown>;
}

async function executeHubSpotContactUpdate(target: ExecutionTarget, payload: CommandInput) {
  const tokenEnv = metadataString(target.metadata, "auth_env_key");
  const token = resolveCredentialValue(target.metadata as Prisma.JsonValue, "auth_token", tokenEnv);
  if (!token) {
    throw new Error(`Credential error: missing HubSpot token env '${tokenEnv ?? "auth_env_key"}'.`);
  }

  const contactId = typeof payload.contact_id === "string" ? payload.contact_id : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!contactId && !email) {
    throw new Error("HubSpot execution requires contact_id or email.");
  }

  const propertiesFromInput: Record<string, string> =
    payload.properties && typeof payload.properties === "object" && !Array.isArray(payload.properties)
      ? Object.fromEntries(
          Object.entries(payload.properties as Record<string, unknown>).filter(([, value]) => typeof value === "string"),
        ) as Record<string, string>
      : {};

  const properties: Record<string, string> = {
    ...propertiesFromInput,
  };

  if (typeof payload.firstname === "string") properties.firstname = payload.firstname;
  if (typeof payload.lastname === "string") properties.lastname = payload.lastname;
  if (typeof payload.phone === "string") properties.phone = payload.phone;
  if (typeof payload.lifecyclestage === "string") properties.lifecyclestage = payload.lifecyclestage;
  if (typeof payload.company === "string") properties.company = payload.company;

  if (Object.keys(properties).length === 0) {
    throw new Error("HubSpot execution requires properties to update.");
  }

  const identifier = contactId ?? email!;
  const idQuery = contactId ? "" : "?idProperty=email";
  const response = await fetch(`${target.baseUrl}/crm/v3/objects/contacts/${encodeURIComponent(identifier)}${idQuery}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HubSpot execution failed: ${response.status} ${body.slice(0, 320)}`);
  }

  const json = (await response.json()) as { id?: string; properties?: Record<string, unknown> };
  return {
    contact_id: json.id ?? identifier,
    status: "updated",
    provider: "hubspot",
    properties: json.properties ?? properties,
  } satisfies Record<string, unknown>;
}

function resolveProviderOperation(target: ExecutionTarget): ProviderOperation {
  const operation = metadataString(target.metadata, "provider_operation");
  if (!operation) {
    if (target.providerKey === "stripe") return "create_refund";
    if (target.providerKey === "zendesk") return "update_ticket";
    if (target.providerKey === "hubspot") return "update_contact";
    return "create_refund";
  }
  if (operation === "create_refund" || operation === "retrieve_refund" || operation === "update_ticket" || operation === "update_contact") {
    return operation;
  }
  throw new Error(`Unsupported provider operation '${operation}'.`);
}

function resolveExecutionTarget(command: {
  app: { type: "internal_web_app" | "custom_web_app" | "api_schema" | "uploaded_workflow_evidence"; baseUrl: string; metadataJson: Prisma.JsonValue | null } | null;
}) {
  if (!command.app) {
    return {
      providerKey: "internal_acme_support_admin",
      baseUrl: env.APP_BASE_URL,
      supportsBrowserFallback: true,
      metadata: {},
    } satisfies ExecutionTarget;
  }

  const providerKey = resolveProviderKeyFromMetadata(command.app.type, command.app.metadataJson);
  const supportsBrowserFallback = providerKey === "internal_acme_support_admin" || providerKey === "custom_web_app";
  return {
    providerKey,
    baseUrl: command.app.baseUrl || env.APP_BASE_URL,
    supportsBrowserFallback,
    metadata: asMetadataRecord(command.app.metadataJson),
  } satisfies ExecutionTarget;
}

async function executeByTargetApi(target: ExecutionTarget, organisationId: string, payload: CommandInput) {
  if (target.providerKey === "stripe") {
    const operation = resolveProviderOperation(target);
    if (operation === "retrieve_refund") {
      return executeStripeRetrieveRefund(target, payload);
    }
    return executeStripeRefund(target, organisationId, payload);
  }
  if (target.providerKey === "zendesk") {
    return executeZendeskTicketUpdate(target, payload);
  }
  if (target.providerKey === "hubspot") {
    return executeHubSpotContactUpdate(target, payload);
  }
  return executeByApi(target.baseUrl, organisationId, payload);
}

async function executeByBrowser(baseUrl: string, payload: CommandInput) {
  if (typeof payload.ticket_id !== "string") {
    throw new Error("Browser execution requires ticket_id.");
  }
  if (typeof payload.amount !== "number" || Number.isNaN(payload.amount)) {
    throw new Error("Browser execution requires numeric amount.");
  }
  if (typeof payload.reason !== "string") {
    throw new Error("Browser execution requires reason.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/acme/tickets/${payload.ticket_id}`);
    await page.fill('[data-testid="refund-amount"]', String(payload.amount));
    await page.fill('[data-testid="refund-reason"]', payload.reason);
    await page.click('[data-testid="refund-submit"]');
    await page.waitForSelector('[data-testid="refund-confirmation"]', { timeout: 10000 });
    const confirmation = await page.textContent('[data-testid="refund-confirmation"]');
    return {
      status: "succeeded",
      execution_mode: "browser",
      refund_id: confirmation?.trim() ?? null,
      ticket_status: "refund_issued",
    };
  } finally {
    await browser.close();
  }
}

async function mapExecutionToResult(executionId: string): Promise<CommandRunResult> {
  const execution = await prisma.commandExecution.findUnique({ where: { id: executionId } });
  if (!execution) {
    throw new Error(`Execution not found: ${executionId}`);
  }

  if (execution.status === ExecutionStatus.waiting_for_approval) {
    const pending = await prisma.approval.findFirst({
      where: { executionId: execution.id, status: ApprovalStatus.pending },
      orderBy: { createdAt: "desc" },
    });
    return {
      status: "waiting_for_approval",
      approval_required: true,
      reason: pending?.reason ?? "approval required",
      execution_id: execution.id,
    };
  }

  if (execution.status === ExecutionStatus.succeeded) {
    return {
      status: "succeeded",
      execution_id: execution.id,
      output: (execution.outputJson as Record<string, unknown>) ?? {},
      execution_mode: execution.executionMode,
    };
  }

  return {
    status: "failed",
    execution_id: execution.id,
    error: execution.errorMessage ?? "Execution failed",
  };
}

async function markExecutionFailed(params: {
  executionId: string;
  organisationId: string;
  commandId: string;
  agentName: string;
  error: string;
}) {
  await prisma.commandExecution.update({
    where: { id: params.executionId },
    data: {
      status: ExecutionStatus.failed,
      errorMessage: params.error,
      completedAt: new Date(),
    },
  });

  await writeAuditLog({
    organisationId: params.organisationId,
    eventType: "command_execution_failed",
    actorType: "agent",
    actorId: params.agentName,
    commandId: params.commandId,
    executionId: params.executionId,
    details: { error: params.error },
  });

  return {
    status: "failed",
    execution_id: params.executionId,
    error: params.error,
  } satisfies CommandRunResult;
}

export async function runCommandByName(params: {
  organisationId: string;
  userId: string;
  commandName: string;
  agentName: string;
  input: Record<string, unknown>;
  dryRun?: boolean;
  idempotencyKey?: string;
}): Promise<CommandRunResult> {
  const command = await prisma.actionCommand.findFirst({
    where: {
      organisationId: params.organisationId,
      name: params.commandName,
      status: CommandStatus.published,
    },
    include: {
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
    throw new Error(`Published command not found: ${params.commandName}`);
  }

  if (params.idempotencyKey) {
    const existing = await prisma.commandExecution.findFirst({
      where: {
        organisationId: params.organisationId,
        commandId: command.id,
        idempotencyKey: params.idempotencyKey,
      },
    });

    if (existing) {
      return mapExecutionToResult(existing.id);
    }
  }

  const execution = await prisma.commandExecution.create({
    data: {
      organisationId: params.organisationId,
      commandId: command.id,
      idempotencyKey: params.idempotencyKey ?? null,
      userId: params.userId,
      agentName: params.agentName,
      inputJson: params.input as Prisma.InputJsonValue,
      status: ExecutionStatus.queued,
      executionMode: ExecutionMode.api,
      startedAt: new Date(),
    },
  });

  await writeAuditLog({
    organisationId: params.organisationId,
    eventType: params.dryRun ? "command_dry_run" : "command_execution_started",
    actorType: "agent",
    actorId: params.agentName,
    commandId: command.id,
    executionId: execution.id,
    details: { input: params.input },
  });

  const issues = validateInput(command.inputSchemaJson as Record<string, string>, params.input);
  if (issues.length > 0) {
    return markExecutionFailed({
      executionId: execution.id,
      organisationId: params.organisationId,
      commandId: command.id,
      agentName: params.agentName,
      error: `Input validation failed: ${issues.join(", ")}`,
    });
  }

  const input = params.input as unknown as CommandInput;
  const effectiveApprovalRules = await resolveEffectiveApprovalRules(params.organisationId, command.approvalRulesJson);
  const threshold = (effectiveApprovalRules as { amount_greater_than?: number } | null)?.amount_greater_than;

  if (threshold !== undefined && typeof input.amount === "number" && input.amount > threshold) {
    const stages = buildApprovalStages(effectiveApprovalRules, input);
    const firstStage = stages[0];

    await prisma.commandExecution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.waiting_for_approval,
        approvalStatus: ApprovalStatus.pending,
      },
    });

    await prisma.approval.create({
      data: {
        organisationId: params.organisationId,
        executionId: execution.id,
        commandId: command.id,
        requestedByAgent: params.agentName,
        reason: `${firstStage.name}: amount exceeds approval threshold (${threshold})`,
        stageIndex: 0,
        stageName: firstStage.name,
        requiredRole: firstStage.required_role ?? null,
      },
    });

    await writeAuditLog({
      organisationId: params.organisationId,
      eventType: "approval_requested",
      actorType: "agent",
      actorId: params.agentName,
      commandId: command.id,
      executionId: execution.id,
      details: {
        threshold,
        amount: input.amount,
        source: command.approvalRulesJson ? "command" : "approval_policy",
        stage_index: 0,
        stage_name: firstStage.name,
        required_role: firstStage.required_role ?? null,
      },
    });

    return {
      status: "waiting_for_approval",
      approval_required: true,
      reason: "amount exceeds approval threshold",
      execution_id: execution.id,
    };
  }

  if (params.dryRun) {
    await prisma.commandExecution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.succeeded,
        outputJson: { dry_run: true, validated: true } as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    return {
      status: "succeeded",
      execution_id: execution.id,
      output: { dry_run: true, validated: true },
      execution_mode: ExecutionMode.api,
    };
  }

  let output: Record<string, unknown>;
  let mode: ExecutionMode = ExecutionMode.api;
  const target = resolveExecutionTarget(command);

  try {
    await prisma.commandExecution.update({
      where: { id: execution.id },
      data: { status: ExecutionStatus.running },
    });

    output = await executeByTargetApi(target, params.organisationId, input);
  } catch (apiError) {
    if (!target.supportsBrowserFallback) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      return markExecutionFailed({
        executionId: execution.id,
        organisationId: params.organisationId,
        commandId: command.id,
        agentName: params.agentName,
        error: errorMessage,
      });
    }
    try {
      output = await executeByBrowser(target.baseUrl, input);
      mode = ExecutionMode.browser;
    } catch (browserError) {
      const errorMessage = browserError instanceof Error ? browserError.message : String(browserError);
      return markExecutionFailed({
        executionId: execution.id,
        organisationId: params.organisationId,
        commandId: command.id,
        agentName: params.agentName,
        error: errorMessage,
      });
    }

    await writeAuditLog({
      organisationId: params.organisationId,
      eventType: "command_execution_api_fallback",
      actorType: "system",
      actorId: null,
      commandId: command.id,
      executionId: execution.id,
      details: {
        api_error: apiError instanceof Error ? apiError.message : String(apiError),
      },
    });
  }

  await prisma.commandExecution.update({
    where: { id: execution.id },
    data: {
      status: ExecutionStatus.succeeded,
      outputJson: output as Prisma.InputJsonValue,
      executionMode: mode,
      completedAt: new Date(),
    },
  });

  await writeAuditLog({
    organisationId: params.organisationId,
    eventType: "command_execution_succeeded",
    actorType: "agent",
    actorId: params.agentName,
    commandId: command.id,
    executionId: execution.id,
    details: { output, execution_mode: mode },
  });

  return {
    status: "succeeded",
    execution_id: execution.id,
    output,
    execution_mode: mode,
  };
}

export async function finalizeApprovedExecution(params: {
  approvalId: string;
  reviewerId: string;
  reviewerRole: string;
}) {
  const approval = await prisma.approval.findUnique({
    include: {
      execution: true,
      command: {
        include: {
          app: {
            select: {
              type: true,
              baseUrl: true,
              metadataJson: true,
            },
          },
        },
      },
    },
    where: { id: params.approvalId },
  });
  if (!approval) throw new Error("Approval not found");
  if (approval.status !== ApprovalStatus.pending) throw new Error("Approval is not pending");

  const input = approval.execution.inputJson as unknown as CommandInput;
  const effectiveApprovalRules = await resolveEffectiveApprovalRules(approval.organisationId, approval.command.approvalRulesJson);
  const stages = buildApprovalStages(effectiveApprovalRules, input);
  const currentStage = stages[approval.stageIndex] ?? null;
  if (!currentStage) {
    throw new Error(`Approval stage ${approval.stageIndex} not found`);
  }
  if (!canRoleApproveStage(params.reviewerRole, approval.requiredRole ?? currentStage.required_role)) {
    throw new Error(
      `Forbidden: reviewer role '${params.reviewerRole}' cannot approve stage requiring '${approval.requiredRole ?? currentStage.required_role ?? "any"}'`,
    );
  }

  await prisma.approval.update({
    where: { id: params.approvalId },
    data: { status: ApprovalStatus.approved, reviewerId: params.reviewerId, resolvedAt: new Date() },
  });

  const nextStageIndex = approval.stageIndex + 1;
  const nextStage = stages[nextStageIndex] ?? null;
  if (nextStage) {
    const nextApproval = await prisma.approval.create({
      data: {
        organisationId: approval.organisationId,
        executionId: approval.executionId,
        commandId: approval.commandId,
        requestedByAgent: approval.requestedByAgent,
        reason: `${nextStage.name}: additional approval required`,
        stageIndex: nextStageIndex,
        stageName: nextStage.name,
        requiredRole: nextStage.required_role ?? null,
      },
    });

    await prisma.commandExecution.update({
      where: { id: approval.executionId },
      data: { status: ExecutionStatus.waiting_for_approval, approvalStatus: ApprovalStatus.pending },
    });

    await writeAuditLog({
      organisationId: approval.organisationId,
      eventType: "approval_requested",
      actorType: "user",
      actorId: params.reviewerId,
      commandId: approval.commandId,
      executionId: approval.executionId,
      details: {
        stage_index: nextStageIndex,
        stage_name: nextStage.name,
        required_role: nextStage.required_role ?? null,
        approval_id: nextApproval.id,
      },
    });

    return {
      status: "waiting_for_approval",
      next_stage: nextStage.name,
      next_stage_index: nextStageIndex,
      approval_id: nextApproval.id,
    };
  }

  await prisma.commandExecution.update({
    where: { id: approval.executionId },
    data: { status: ExecutionStatus.running, approvalStatus: ApprovalStatus.approved },
  });

  const target = resolveExecutionTarget(approval.command);

  try {
    const output = await executeByTargetApi(target, approval.organisationId, input);

    await prisma.commandExecution.update({
      where: { id: approval.executionId },
      data: {
        status: ExecutionStatus.succeeded,
        outputJson: output as Prisma.InputJsonValue,
        completedAt: new Date(),
        executionMode: ExecutionMode.api,
      },
    });

    await writeAuditLog({
      organisationId: approval.organisationId,
      eventType: "approval_approved",
      actorType: "user",
      actorId: params.reviewerId,
      commandId: approval.commandId,
      executionId: approval.executionId,
      details: { approval_id: params.approvalId },
    });

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.commandExecution.update({
      where: { id: approval.executionId },
      data: {
        status: ExecutionStatus.failed,
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    await writeAuditLog({
      organisationId: approval.organisationId,
      eventType: "command_execution_failed",
      actorType: "system",
      actorId: null,
      commandId: approval.commandId,
      executionId: approval.executionId,
      details: { error: message, source: "approval_finalize" },
    });

    throw error;
  }
}

export async function rejectApproval(params: {
  approvalId: string;
  reviewerId: string;
  reason: string;
}) {
  const approval = await prisma.approval.findUnique({ where: { id: params.approvalId } });
  if (!approval) throw new Error("Approval not found");

  await prisma.approval.update({
    where: { id: params.approvalId },
    data: {
      status: ApprovalStatus.rejected,
      reviewerId: params.reviewerId,
      reason: params.reason,
      resolvedAt: new Date(),
    },
  });

  await prisma.commandExecution.update({
    where: { id: approval.executionId },
    data: {
      status: ExecutionStatus.failed,
      approvalStatus: ApprovalStatus.rejected,
      errorMessage: `Rejected: ${params.reason}`,
      completedAt: new Date(),
    },
  });

  await writeAuditLog({
    organisationId: approval.organisationId,
    eventType: "approval_rejected",
    actorType: "user",
    actorId: params.reviewerId,
    commandId: approval.commandId,
    executionId: approval.executionId,
    details: { reason: params.reason },
  });
}
