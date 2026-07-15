import { ConnectionStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { inferProviderKey } from "@/lib/connectors/catalog";
import { hasEncryptedCredentials, setEncryptedCredentials } from "@/lib/connector-credentials";
import { asMetadataRecord } from "@/lib/connectors/metadata";
import { requirePermission } from "@/lib/permissions";
import { createAppSchema } from "@/lib/schemas";

function safeMetadata(metadata: Prisma.JsonValue | null | undefined) {
  const base = asMetadataRecord(metadata);
  const next = { ...base } as Record<string, unknown>;
  delete next.credentials_encrypted;
  return next;
}

function sanitizeApp<T extends { metadataJson: Prisma.JsonValue | null }>(app: T) {
  return {
    ...app,
    metadataJson: safeMetadata(app.metadataJson),
    has_credentials: hasEncryptedCredentials(app.metadataJson),
  };
}

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "apps:read");
    const apps = await prisma.app.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ apps: apps.map(sanitizeApp) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const json = await request.json();
    const parsed = createAppSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid app payload", parsed.error.flatten());
    }

    const metadata: Record<string, unknown> = {
      ...(parsed.data.metadata_json ?? {}),
      provider_key: parsed.data.provider_key ?? inferProviderKey(parsed.data.type),
      ...(parsed.data.auth_env_key ? { auth_env_key: parsed.data.auth_env_key } : {}),
      ...(parsed.data.username_env_key ? { username_env_key: parsed.data.username_env_key } : {}),
      ...(parsed.data.provider_operation ? { provider_operation: parsed.data.provider_operation } : {}),
    };

    const payload = json as { credentials?: Record<string, unknown> };
    const metadataJson =
      payload.credentials && typeof payload.credentials === "object"
        ? setEncryptedCredentials(metadata as Prisma.JsonValue, payload.credentials)
        : (metadata as Prisma.InputJsonValue);

    const app = await prisma.app.create({
      data: {
        organisationId,
        name: parsed.data.name,
        type: parsed.data.type,
        baseUrl: parsed.data.base_url,
        authMethod: parsed.data.auth_method,
        executionMode: parsed.data.execution_mode,
        metadataJson,
        connectionStatus: ConnectionStatus.not_connected,
      },
    });

    return ok({ app: sanitizeApp(app) }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
