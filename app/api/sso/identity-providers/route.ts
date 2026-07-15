import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "identity:read");
    const providers = await prisma.identityProvider.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ providers });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "identity:manage");
    const body = await request.json();

    if (typeof body.name !== "string" || typeof body.provider_type !== "string") {
      return badRequest("name and provider_type are required");
    }

    const provider = await prisma.identityProvider.create({
      data: {
        organisationId,
        name: body.name,
        providerType: body.provider_type,
        issuer: typeof body.issuer === "string" ? body.issuer : null,
        ssoUrl: typeof body.sso_url === "string" ? body.sso_url : null,
        x509Cert: typeof body.x509_cert === "string" ? body.x509_cert : null,
        domainsJson: Array.isArray(body.domains) ? (body.domains as Prisma.InputJsonValue) : Prisma.JsonNull,
        metadataJson:
          body.metadata && typeof body.metadata === "object" ? (body.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        enabled: body.enabled === false ? false : true,
      },
    });

    return ok({ provider }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return serverError(error);
  }
}

