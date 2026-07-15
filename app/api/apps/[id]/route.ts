import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { asMetadataRecord } from "@/lib/connectors/metadata";
import { hasEncryptedCredentials, setEncryptedCredentials } from "@/lib/connector-credentials";
import { requirePermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

function safeMetadata(metadata: Prisma.JsonValue | null | undefined) {
  const next = { ...asMetadataRecord(metadata) } as Record<string, unknown>;
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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "apps:read");
    const { id } = await params;

    const app = await prisma.app.findFirst({ where: { id, organisationId } });
    if (!app) return notFound("App not found");

    return ok({ app: sanitizeApp(app) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const { id } = await params;
    const json = await request.json();

    const app = await prisma.app.findFirst({ where: { id, organisationId } });
    if (!app) return notFound("App not found");

    const credentials =
      typeof json.credentials === "object" && json.credentials !== null && !Array.isArray(json.credentials)
        ? (json.credentials as Record<string, unknown>)
        : null;

    const updated = await prisma.app.update({
      where: { id },
      data: {
        name: typeof json.name === "string" ? json.name : undefined,
        baseUrl: typeof json.base_url === "string" ? json.base_url : undefined,
        authMethod: typeof json.auth_method === "string" ? json.auth_method : undefined,
        metadataJson: (() => {
          const wantsMetadata =
            typeof json.metadata_json === "object" ||
            typeof json.provider_key === "string" ||
            typeof json.auth_env_key === "string" ||
            typeof json.username_env_key === "string" ||
            typeof json.provider_operation === "string" ||
            Boolean(credentials);
          if (!wantsMetadata) return undefined;

          const merged = {
            ...asMetadataRecord(app.metadataJson),
            ...(typeof json.metadata_json === "object" ? json.metadata_json : {}),
            ...(typeof json.provider_key === "string" ? { provider_key: json.provider_key } : {}),
            ...(typeof json.auth_env_key === "string" ? { auth_env_key: json.auth_env_key } : {}),
            ...(typeof json.username_env_key === "string" ? { username_env_key: json.username_env_key } : {}),
            ...(typeof json.provider_operation === "string" ? { provider_operation: json.provider_operation } : {}),
          };
          return credentials ? setEncryptedCredentials(merged, credentials) : merged;
        })(),
      },
    });

    return ok({ app: sanitizeApp(updated) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const { id } = await params;

    const app = await prisma.app.findFirst({ where: { id, organisationId } });
    if (!app) return notFound("App not found");

    await prisma.app.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return badRequest("Unable to delete app", error instanceof Error ? error.message : String(error));
  }
}
