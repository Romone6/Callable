import type { AppType } from "@prisma/client";

export type ConnectorProviderKey = "internal_acme_support_admin" | "zendesk" | "salesforce" | "custom_web_app" | "api_schema" | "uploaded_workflow_evidence";
export type ConnectorDefinition = { providerKey: ConnectorProviderKey; label: string; status: "available"; appTypes: AppType[]; capabilities: string[] };
export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  { providerKey: "internal_acme_support_admin", label: "Acme Support Admin (controlled target)", status: "available", appTypes: ["internal_web_app"], capabilities: ["connection_test", "evidence_ingest", "api_execution", "drift_check"] },
  { providerKey: "zendesk", label: "Zendesk ticket updates", status: "available", appTypes: ["custom_web_app"], capabilities: ["connection_test", "evidence_ingest", "api_execution", "drift_check"] },
  { providerKey: "salesforce", label: "Salesforce connection", status: "available", appTypes: ["custom_web_app"], capabilities: ["connection_test", "evidence_ingest"] },
  { providerKey: "custom_web_app", label: "Custom Web App", status: "available", appTypes: ["custom_web_app"], capabilities: ["evidence_ingest"] },
  { providerKey: "api_schema", label: "API Schema Target", status: "available", appTypes: ["api_schema"], capabilities: ["evidence_ingest"] },
  { providerKey: "uploaded_workflow_evidence", label: "Workflow Evidence", status: "available", appTypes: ["uploaded_workflow_evidence"], capabilities: ["evidence_ingest"] },
];
export function getConnectorByKey(providerKey: string | null | undefined) { return CONNECTOR_CATALOG.find((connector) => connector.providerKey === providerKey) ?? null; }
export function inferProviderKey(appType: AppType): ConnectorProviderKey { return appType === "internal_web_app" ? "internal_acme_support_admin" : appType; }
