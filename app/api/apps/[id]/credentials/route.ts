import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { clearEncryptedCredentials, hasEncryptedCredentials, setEncryptedCredentials } from "@/lib/connector-credentials";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

function parseCredentials(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const { id } = await params;
    const app = await prisma.app.findFirst({ where: { id, organisationId } });
    if (!app) return notFound("App not found");

    const body = await request.json();
    const credentials = parseCredentials(body.credentials);
    if (!credentials) {
      return badRequest("credentials object is required");
    }

    const metadataJson = setEncryptedCredentials(app.metadataJson, credentials);
    const updated = await prisma.app.update({
      where: { id: app.id },
      data: { metadataJson },
    });

    await writeAuditLog({
      organisationId,
      eventType: "connector_credentials_rotated",
      actorType: "user",
      actorId: userId,
      details: {
        app_id: app.id,
        provider_key: (updated.metadataJson as Record<string, unknown> | null)?.provider_key ?? null,
      },
    });

    return ok({ app_id: updated.id, credentials_stored: true, has_credentials: hasEncryptedCredentials(updated.metadataJson) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    requirePermission(user.role, "apps:manage");
    const { id } = await params;
    const app = await prisma.app.findFirst({ where: { id, organisationId } });
    if (!app) return notFound("App not found");

    const updated = await prisma.app.update({
      where: { id: app.id },
      data: { metadataJson: clearEncryptedCredentials(app.metadataJson) },
    });

    await writeAuditLog({
      organisationId,
      eventType: "connector_credentials_revoked",
      actorType: "user",
      actorId: userId,
      details: {
        app_id: app.id,
        provider_key: (updated.metadataJson as Record<string, unknown> | null)?.provider_key ?? null,
      },
    });

    return ok({ app_id: updated.id, credentials_removed: true, has_credentials: hasEncryptedCredentials(updated.metadataJson) });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
