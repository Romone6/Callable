import { z } from "zod";

export const appFormSchema = z.object({
  name: z.string().min(2),
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
  ]),
  base_url: z.url(),
  auth_method: z.string().min(1),
  execution_mode: z.string().min(1),
  auth_env_key: z.string().optional(),
  username_env_key: z.string().optional(),
  provider_operation: z.enum(["create_refund", "retrieve_refund", "update_ticket", "update_contact"]).optional(),
});

export const discoverySourceSchema = z.object({
  name: z.string().min(2),
  app_id: z.string().optional(),
  type: z.enum([
    "sop_document",
    "csv_ticket_export",
    "json_browser_trace",
    "openapi_schema",
    "playwright_trace",
    "manual_process_text",
  ]),
  raw_text: z.string().min(3),
});

export const commandSchemaEditorSchema = z.object({
  input_schema_json: z.string().min(2),
  output_schema_json: z.string().min(2),
  approval_rules_json: z.string().min(2),
}).superRefine((value, ctx) => {
  for (const key of ["input_schema_json", "output_schema_json", "approval_rules_json"] as const) {
    try {
      JSON.parse(value[key]);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be valid JSON",
        path: [key],
      });
    }
  }
});

export const approvalRuleSchema = z.object({
  amount_greater_than: z.number().min(0),
});

export const runCommandSchema = z.object({
  ticket_id: z.string().min(3),
  amount: z.number().positive(),
  reason: z.string().min(2),
  agent_name: z.string().min(2),
});

export const apiKeyFormSchema = z.object({
  name: z.string().min(2),
  scopes: z.array(z.string()).min(1),
});

export const settingsSchema = z.object({
  workspace_name: z.string().min(2),
  default_approval_threshold: z.number().min(0),
});

export type AppFormInput = z.infer<typeof appFormSchema>;
export type DiscoverySourceInput = z.infer<typeof discoverySourceSchema>;
export type CommandSchemaEditorInput = z.infer<typeof commandSchemaEditorSchema>;
export type ApprovalRuleInput = z.infer<typeof approvalRuleSchema>;
export type RunCommandInput = z.infer<typeof runCommandSchema>;
export type ApiKeyFormInput = z.infer<typeof apiKeyFormSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;

