import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { assertIpAllowed, getEffectiveSecurityPolicy } from "@/lib/security-policy";

export type ApiKeyScope = "commands:read" | "commands:run" | "executions:read" | "audit:read";

export type ApiKeyContext = {
  apiKeyId: string;
  organisationId: string;
  scopes: string[];
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extractBearer(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireApiKey(request: Request, requiredScopes: ApiKeyScope[]): Promise<ApiKeyContext> {
  const token = extractBearer(request);
  if (!token) {
    throw new Error("Unauthorized: missing bearer API key");
  }

  const keyHash = sha256(token);

  const record = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
    },
  });

  if (!record) {
    throw new Error("Unauthorized: invalid API key");
  }

  const scopes = Array.isArray(record.scopesJson) ? record.scopesJson.map(String) : [];
  const missing = requiredScopes.filter((scope) => !scopes.includes(scope));
  if (missing.length > 0) {
    throw new Error(`Forbidden: missing scopes (${missing.join(", ")})`);
  }

  const policy = await getEffectiveSecurityPolicy(record.organisationId);
  if (policy.api_key_ttl_days > 0) {
    const expiresAt = new Date(record.createdAt.getTime() + policy.api_key_ttl_days * 24 * 60 * 60 * 1000);
    if (Date.now() > expiresAt.getTime()) {
      throw new Error("Unauthorized: API key expired by organisation policy");
    }
  }

  assertIpAllowed(request, policy.ip_allowlist);

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    apiKeyId: record.id,
    organisationId: record.organisationId,
    scopes,
  };
}

export function redactSecret(value: string) {
  if (!value) return value;
  if (value.length <= 8) return "[REDACTED]";
  return `${value.slice(0, 4)}...[REDACTED]...${value.slice(-2)}`;
}

