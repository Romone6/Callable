import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { runConnectorConnectionTest } from "@/lib/connectors/connection-test";
import { asMetadataRecord } from "@/lib/connectors/metadata";
import { hasEncryptedCredentials } from "@/lib/connector-credentials";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

function safeMetadata(metadata: Prisma.JsonValue | null | undefined) {
  const next = { ...asMetadataRecord(metadata) } as Record<string, unknown>;
  delete next.credentials_encrypted;
  return next;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const { id } = await params;
    const app = await prisma.app.findFirst({ where: { id, organisationId } });

    if (!app) return notFound("App not found");

    const result = await runConnectorConnectionTest(app);

    const metadata = {
      ...asMetadataRecord(app.metadataJson),
      last_connection_test_at: new Date().toISOString(),
      last_connection_provider: result.providerKey,
      last_connection_error: result.error ?? null,
      last_connection_http_status: result.httpStatus ?? null,
    };

    const updated = await prisma.app.update({
      where: { id: app.id },
      data: {
        connectionStatus: result.connectionStatus,
        metadataJson: metadata as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "app_connection_tested",
      actorType: "user",
      actorId: userId,
      details: {
        app_id: app.id,
        provider_key: result.providerKey,
        provider_status: result.providerStatus,
        connection_status: result.connectionStatus,
        error: result.error ?? null,
        http_status: result.httpStatus ?? null,
      },
    });

    return ok({
      app: {
        ...updated,
        metadataJson: safeMetadata(updated.metadataJson),
        has_credentials: hasEncryptedCredentials(updated.metadataJson),
      },
      tested: true,
      provider_key: result.providerKey,
      provider_status: result.providerStatus,
      connection_status: result.connectionStatus,
      error: result.error,
      http_status: result.httpStatus,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
