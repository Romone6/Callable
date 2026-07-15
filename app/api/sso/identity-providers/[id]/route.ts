import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.identityProvider.findFirst({ where: { id, organisationId } });
    if (!existing) return notFound("Identity provider not found");

    const updated = await prisma.identityProvider.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        providerType: typeof body.provider_type === "string" ? body.provider_type : undefined,
        issuer: typeof body.issuer === "string" ? body.issuer : undefined,
        ssoUrl: typeof body.sso_url === "string" ? body.sso_url : undefined,
        x509Cert: typeof body.x509_cert === "string" ? body.x509_cert : undefined,
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        domainsJson: Array.isArray(body.domains) ? (body.domains as Prisma.InputJsonValue) : undefined,
        metadataJson: body.metadata && typeof body.metadata === "object" ? (body.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    return ok({ provider: updated });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return serverError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    const { id } = await params;
    const existing = await prisma.identityProvider.findFirst({ where: { id, organisationId } });
    if (!existing) return notFound("Identity provider not found");

    await prisma.identityProvider.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return badRequest("Unable to delete identity provider", error instanceof Error ? error.message : String(error));
  }
}

