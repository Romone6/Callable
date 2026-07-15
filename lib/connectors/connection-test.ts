import type { App, ConnectionStatus } from "@prisma/client";
import { getConnectorByKey } from "@/lib/connectors/catalog";
import { asMetadataRecord, metadataString, resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";
import { resolveCredentialValue } from "@/lib/connector-credentials";

export type ConnectorTestResult = {
  providerKey: string;
  providerStatus: "available" | "in_development" | "coming_soon" | "custom_connector";
  connectionStatus: ConnectionStatus;
  error?: string;
  httpStatus?: number;
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function testHealthEndpoint(baseUrl: string) {
  const response = await fetchWithTimeout(`${baseUrl}/api/health`, { method: "GET" });
  return response;
}

export async function runConnectorConnectionTest(app: App): Promise<ConnectorTestResult> {
  const metadata = asMetadataRecord(app.metadataJson);
  const providerKey = resolveProviderKeyFromMetadata(app.type, app.metadataJson);
  const connector = getConnectorByKey(providerKey);

  if (!connector) {
    return {
      providerKey,
      providerStatus: "coming_soon",
      connectionStatus: "failed",
      error: `Unknown connector provider '${providerKey}'.`,
    };
  }

  if (!connector.capabilities.includes("connection_test")) {
    return {
      providerKey,
      providerStatus: connector.status,
      connectionStatus: "failed",
      error: `Connection test is unavailable for '${connector.label}'.`,
    };
  }

  if (providerKey === "internal_acme_support_admin" || providerKey === "custom_web_app" || providerKey === "api_schema") {
    try {
      const response = await testHealthEndpoint(app.baseUrl);
      if (!response.ok) {
        return {
          providerKey,
          providerStatus: connector.status,
          connectionStatus: "failed",
          httpStatus: response.status,
          error: `Connection test returned status ${response.status}.`,
        };
      }
      return { providerKey, providerStatus: connector.status, connectionStatus: "connected", httpStatus: response.status };
    } catch (error) {
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (providerKey === "stripe") {
    const keyName = metadataString(metadata, "auth_env_key");
    const apiKey = resolveCredentialValue(app.metadataJson, "auth_token", keyName);
    if (!apiKey) {
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        error: `Credential error: missing auth env value '${keyName ?? "auth_env_key"}'.`,
      };
    }
    const baseUrl = app.baseUrl || "https://api.stripe.com";
    const response = await fetchWithTimeout(`${baseUrl}/v1/account`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        httpStatus: response.status,
        error: `Stripe connection failed (${response.status}): ${body.slice(0, 240)}`,
      };
    }
    return { providerKey, providerStatus: connector.status, connectionStatus: "connected", httpStatus: response.status };
  }

  if (providerKey === "zendesk") {
    const tokenEnvName = metadataString(metadata, "auth_env_key");
    const emailEnvName = metadataString(metadata, "username_env_key");
    const token = resolveCredentialValue(app.metadataJson, "auth_token", tokenEnvName);
    const email = resolveCredentialValue(app.metadataJson, "username", emailEnvName);
    if (!token || !email) {
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        error: `Credential error: missing Zendesk token/email env values '${tokenEnvName ?? "auth_env_key"}' and '${emailEnvName ?? "username_env_key"}'.`,
      };
    }

    const basic = Buffer.from(`${email}/token:${token}`).toString("base64");
    const response = await fetchWithTimeout(`${app.baseUrl}/api/v2/users/me.json`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        httpStatus: response.status,
        error: `Zendesk connection failed (${response.status}): ${body.slice(0, 240)}`,
      };
    }
    return { providerKey, providerStatus: connector.status, connectionStatus: "connected", httpStatus: response.status };
  }

  if (providerKey === "hubspot") {
    const keyName = metadataString(metadata, "auth_env_key");
    const token = resolveCredentialValue(app.metadataJson, "auth_token", keyName);
    if (!token) {
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        error: `Credential error: missing auth env value '${keyName ?? "auth_env_key"}'.`,
      };
    }
    const baseUrl = app.baseUrl || "https://api.hubapi.com";
    const response = await fetchWithTimeout(`${baseUrl}/integrations/v1/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      return {
        providerKey,
        providerStatus: connector.status,
        connectionStatus: "failed",
        httpStatus: response.status,
        error: `HubSpot connection failed (${response.status}): ${body.slice(0, 240)}`,
      };
    }
    return { providerKey, providerStatus: connector.status, connectionStatus: "connected", httpStatus: response.status };
  }

  return {
    providerKey,
    providerStatus: connector.status,
    connectionStatus: "failed",
    error: `Connection test for '${providerKey}' is not implemented.`,
  };
}
