import { asMetadataRecord, metadataString } from "@/lib/connectors/metadata";
import { isServerEnvironmentVariableName } from "@/lib/connectors/zendesk";

const apiVersion = /^v\d+\.\d+$/;

export function readSalesforceCredentials(metadata: unknown, environment: Record<string, string | undefined> = process.env): { token: string; apiVersion: string } {
  const record = asMetadataRecord(metadata as never);
  const authEnvironmentKey = metadataString(record, "auth_env_key");
  const version = metadataString(record, "api_version");
  if (!authEnvironmentKey || !isServerEnvironmentVariableName(authEnvironmentKey)) {
    throw new Error("Salesforce requires a valid server-only auth_env_key metadata value.");
  }
  if (!version || !apiVersion.test(version)) {
    throw new Error("Salesforce requires an api_version such as v60.0.");
  }
  const token = environment[authEnvironmentKey];
  if (!token) throw new Error(`Salesforce credential environment variable is unavailable (${authEnvironmentKey}).`);
  return { token, apiVersion: version };
}

export function buildSalesforceConnectionRequest(baseUrl: string, credentials: { token: string; apiVersion: string }) {
  return {
    endpoint: new URL(`/services/data/${credentials.apiVersion}/limits`, baseUrl).toString(),
    headers: { authorization: `Bearer ${credentials.token}` },
  };
}
