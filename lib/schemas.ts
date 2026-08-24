import { z } from "zod";

import { isServerEnvironmentVariableName } from "@/lib/connectors/zendesk";
import { readSalesforceCredentials } from "@/lib/connectors/salesforce";

export const createAppSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["internal_web_app", "custom_web_app", "api_schema", "uploaded_workflow_evidence"]),
  provider_key: z.enum([
    "internal_acme_support_admin",
    "zendesk",
    "salesforce",
    "custom_web_app",
    "api_schema",
    "uploaded_workflow_evidence",
  ]).optional(),
  base_url: z.string().url(),
  auth_method: z.string().min(1),
  execution_mode: z.literal("api").default("api"),
  metadata_json: z.record(z.string(), z.unknown()).optional(),
}).superRefine((value, context) => {
  if (value.provider_key !== "zendesk" && value.provider_key !== "salesforce") return;

  const metadata = value.metadata_json ?? {};
  const authEnvironmentKey = metadata.auth_env_key;
  const usernameEnvironmentKey = metadata.username_env_key;

  if (value.provider_key === "salesforce") {
    if (value.type !== "custom_web_app") context.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: "Salesforce must use the custom_web_app app type." });
    try {
      readSalesforceCredentials(metadata, { [String(metadata.auth_env_key ?? "")]: "configured" });
    } catch (error) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata_json"], message: error instanceof Error ? error.message.replace("credential environment variable is unavailable", "auth_env_key must be a server-only environment variable") : "Invalid Salesforce metadata." });
    }
    return;
  }

  if (value.type !== "custom_web_app") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: "Zendesk must use the custom_web_app app type." });
  }
  if (typeof authEnvironmentKey !== "string" || !isServerEnvironmentVariableName(authEnvironmentKey)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata_json", "auth_env_key"], message: "Zendesk auth_env_key must be a server-only environment variable name." });
  }
  if (typeof usernameEnvironmentKey !== "string" || !isServerEnvironmentVariableName(usernameEnvironmentKey)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata_json", "username_env_key"], message: "Zendesk username_env_key must be a server-only environment variable name." });
  }
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

const commandStepSchema = z.object({
  step_type: z.literal("api"),
  api_route: z.string().startsWith("/").max(500),
  http_method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]).default("POST"),
  input_mapping_json: z.record(z.string(), z.unknown()).optional(),
  success_condition_json: z.record(z.string(), z.unknown()).optional(),
  error_condition_json: z.record(z.string(), z.unknown()).optional(),
});

export const commandStepsSchema = z.array(commandStepSchema).min(1).max(20);

export const createApprovalSchema = z.object({
  execution_id: z.string().min(1),
  reason: z.string().min(1).default("Manual approval request"),
  requested_by_agent: z.string().min(1).default("dashboard-user"),
});
