import type { Prisma } from "@prisma/client";
import { getConnectorByKey, inferProviderKey, type ConnectorProviderKey } from "@/lib/connectors/catalog";

export function asMetadataRecord(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
}

export function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value.trim();
}

export function resolveProviderKeyFromMetadata(
  appType: "internal_web_app" | "custom_web_app" | "api_schema" | "uploaded_workflow_evidence",
  metadata: Prisma.JsonValue | null | undefined,
): ConnectorProviderKey {
  const record = asMetadataRecord(metadata);
  const providerKey = metadataString(record, "provider_key");
  const connector = getConnectorByKey(providerKey);
  if (connector) {
    return connector.providerKey;
  }
  return inferProviderKey(appType);
}
