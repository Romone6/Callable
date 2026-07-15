import { z } from "zod";

export const createAppSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["internal_web_app", "custom_web_app", "api_schema", "uploaded_workflow_evidence"]),
  provider_key: z.enum([
    "internal_acme_support_admin",
    "custom_web_app",
    "api_schema",
    "uploaded_workflow_evidence",
    "stripe",
    "zendesk",
    "hubspot",
    "salesforce",
    "netsuite",
    "jira",
  ]).optional(),
  base_url: z.string().url(),
  auth_method: z.string().min(1),
  execution_mode: z.enum(["api", "browser", "hybrid"]).default("hybrid"),
  auth_env_key: z.string().min(1).optional(),
  username_env_key: z.string().min(1).optional(),
  provider_operation: z.enum(["create_refund", "retrieve_refund", "update_ticket", "update_contact"]).optional(),
  metadata_json: z.record(z.string(), z.unknown()).optional(),
});

export const sourceTextSchema = z.object({
  app_id: z.string().optional(),
  type: z.enum([
    "sop_document",
    "csv_ticket_export",
    "json_browser_trace",
    "openapi_schema",
    "playwright_trace",
    "manual_process_text",
  ]),
  name: z.string().min(1),
  raw_text: z.string().min(1),
});

export const runDiscoverySchema = z.object({
  app_id: z.string().optional(),
  source_ids: z.array(z.string()).min(1),
});

export const runAgentCommandSchema = z.object({
  command_name: z.string().min(1),
  agent_name: z.string().min(1),
  dry_run: z.boolean().optional(),
  input: z.record(z.string(), z.unknown()),
});

export const createApprovalSchema = z.object({
  execution_id: z.string().min(1),
  reason: z.string().min(1).default("Manual approval request"),
  requested_by_agent: z.string().min(1).default("dashboard-user"),
});

export const updateRetentionPolicySchema = z.object({
  audit_log_days: z.number().int().min(1).max(3650),
  approval_days: z.number().int().min(1).max(3650),
  execution_days: z.number().int().min(1).max(3650),
});

export const runPurgeSchema = z.object({
  dry_run: z.boolean().default(true),
  resource: z.enum(["all", "audit_logs", "approvals", "executions"]).default("all"),
});

export const createComplianceExportSchema = z.object({
  resource: z.enum(["audit_logs", "approvals", "executions"]),
  format: z.enum(["json", "csv"]).default("json"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(5000).default(1000),
});

export const updateSecurityPolicySchema = z.object({
  session_timeout_minutes: z.number().int().min(5).max(1440),
  api_key_ttl_days: z.number().int().min(1).max(3650),
  require_mfa: z.boolean(),
  ip_allowlist: z.array(z.string().min(3).max(128)).max(200).default([]),
});

export const replayQueueJobSchema = z.object({
  queue: z.enum(["execution", "drift"]),
  job_id: z.string().min(1),
});

export const acknowledgeQueueJobSchema = z.object({
  queue: z.enum(["execution", "drift"]),
  job_id: z.string().min(1),
  note: z.string().max(500).optional(),
});

const sloAlertThresholdsSchema = z.object({
  min_success_rate_percent: z.number().min(0).max(100).optional(),
  max_error_rate_percent: z.number().min(0).max(100).optional(),
  max_avg_duration_seconds: z.number().min(0).max(86400).optional(),
  max_drift_failure_rate_percent: z.number().min(0).max(100).optional(),
  max_pending_approvals: z.number().int().min(0).max(100000).optional(),
});

export const dispatchSloAlertsSchema = z.object({
  lookback_hours: z.number().int().min(1).max(24 * 30).optional(),
  dry_run: z.boolean().default(false),
  webhook_url: z.string().url().optional(),
  thresholds: sloAlertThresholdsSchema.optional(),
});

export const createCustomRoleSchema = z.object({
  role_key: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  permissions: z.array(z.string().min(3).max(64)).min(1).max(100),
});

export const updateCustomRoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  permissions: z.array(z.string().min(3).max(64)).min(1).max(100).optional(),
});

export const assignUserRoleSchema = z.object({
  user_id: z.string().min(1),
  role: z.string().min(3).max(120),
});

const approvalPolicyStageSchema = z.object({
  name: z.string().min(1).max(120),
  required_role: z.string().min(1).max(64).optional(),
  amount_greater_than: z.number().min(0).optional(),
  scenario_gate: z.string().min(1).max(120).optional(),
  exception_path: z.string().min(1).max(120).optional(),
  sla_minutes: z.number().int().min(1).max(10080).optional(),
});

const approvalPolicyJsonSchema = z.object({
  thresholds: z
    .object({
      amount_greater_than: z.number().min(0).optional(),
    })
    .optional(),
  scenario_gates: z.array(z.string().min(1).max(120)).max(100).optional(),
  exception_paths: z.array(z.string().min(1).max(120)).max(100).optional(),
  role_approvers: z
    .array(
      z.object({
        role: z.string().min(1).max(64),
        stages: z.array(z.string().min(1).max(120)).max(100).optional(),
      }),
    )
    .max(100)
    .optional(),
  sla_timers: z
    .array(
      z.object({
        stage: z.string().min(1).max(120),
        minutes: z.number().int().min(1).max(10080),
      }),
    )
    .max(100)
    .optional(),
  stages: z.array(approvalPolicyStageSchema).max(100).optional(),
});

export const createApprovalPolicySchema = z.object({
  name: z.string().min(2).max(120),
  status: z.enum(["active", "paused"]).default("active"),
  is_default: z.boolean().default(false),
  policy_json: approvalPolicyJsonSchema,
});

export const updateApprovalPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["active", "paused"]).optional(),
  is_default: z.boolean().optional(),
  policy_json: approvalPolicyJsonSchema.optional(),
});

export const autoSendSimulateSchema = z.object({
  command_id: z.string().min(1),
  scenario: z.string().min(1).max(120),
  confidence: z.number().min(0).max(1),
  violations: z.array(z.string().min(1).max(120)).max(200).default([]),
  input: z.record(z.string(), z.unknown()).optional(),
  approval_policy_id: z.string().min(1).optional(),
  bypass_request: z.boolean().default(false),
});
