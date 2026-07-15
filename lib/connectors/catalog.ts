import type { AppType } from "@prisma/client";

export type ConnectorAvailability = "available" | "in_development" | "coming_soon" | "custom_connector";

export type ConnectorProviderKey =
  | "internal_acme_support_admin"
  | "custom_web_app"
  | "api_schema"
  | "uploaded_workflow_evidence"
  | "stripe"
  | "zendesk"
  | "hubspot"
  | "salesforce"
  | "netsuite"
  | "jira";

export type ConnectorCapability =
  | "connection_test"
  | "discovery_evidence_ingest"
  | "command_execution_api"
  | "command_execution_browser"
  | "drift_check";

export type ConnectorDefinition = {
  providerKey: ConnectorProviderKey;
  label: string;
  category: string;
  status: ConnectorAvailability;
  appTypes: AppType[];
  capabilities: ConnectorCapability[];
};

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  {
    providerKey: "internal_acme_support_admin",
    label: "Acme Support Admin",
    category: "Internal Admin",
    status: "available",
    appTypes: ["internal_web_app"],
    capabilities: ["connection_test", "discovery_evidence_ingest", "command_execution_api", "command_execution_browser", "drift_check"],
  },
  {
    providerKey: "custom_web_app",
    label: "Custom Web App",
    category: "Custom Web Apps",
    status: "custom_connector",
    appTypes: ["custom_web_app"],
    capabilities: ["connection_test", "discovery_evidence_ingest", "command_execution_browser", "drift_check"],
  },
  {
    providerKey: "api_schema",
    label: "API Schema Target",
    category: "API Schemas",
    status: "available",
    appTypes: ["api_schema"],
    capabilities: ["connection_test", "discovery_evidence_ingest", "command_execution_api", "drift_check"],
  },
  {
    providerKey: "uploaded_workflow_evidence",
    label: "Uploaded Workflow Evidence",
    category: "Workflow Evidence",
    status: "available",
    appTypes: ["uploaded_workflow_evidence"],
    capabilities: ["discovery_evidence_ingest"],
  },
  {
    providerKey: "stripe",
    label: "Stripe",
    category: "Finance",
    status: "in_development",
    appTypes: ["custom_web_app", "api_schema"],
    capabilities: ["connection_test", "command_execution_api"],
  },
  {
    providerKey: "zendesk",
    label: "Zendesk",
    category: "Support",
    status: "in_development",
    appTypes: ["custom_web_app", "api_schema"],
    capabilities: ["connection_test"],
  },
  {
    providerKey: "hubspot",
    label: "HubSpot",
    category: "CRM",
    status: "in_development",
    appTypes: ["custom_web_app", "api_schema"],
    capabilities: ["connection_test"],
  },
  {
    providerKey: "salesforce",
    label: "Salesforce",
    category: "CRM",
    status: "coming_soon",
    appTypes: ["custom_web_app", "api_schema"],
    capabilities: [],
  },
  {
    providerKey: "netsuite",
    label: "NetSuite",
    category: "ERP",
    status: "coming_soon",
    appTypes: ["custom_web_app", "api_schema"],
    capabilities: [],
  },
  {
    providerKey: "jira",
    label: "Jira",
    category: "Project Management",
    status: "coming_soon",
    appTypes: ["custom_web_app", "api_schema"],
    capabilities: [],
  },
];

export function getConnectorByKey(providerKey: string | null | undefined) {
  if (!providerKey) return null;
  return CONNECTOR_CATALOG.find((connector) => connector.providerKey === providerKey) ?? null;
}

export function inferProviderKey(appType: AppType): ConnectorProviderKey {
  switch (appType) {
    case "internal_web_app":
      return "internal_acme_support_admin";
    case "custom_web_app":
      return "custom_web_app";
    case "api_schema":
      return "api_schema";
    case "uploaded_workflow_evidence":
      return "uploaded_workflow_evidence";
    default:
      return "custom_web_app";
  }
}
