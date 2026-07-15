import { prisma } from "@/lib/db";
import { badRequest, notFound, ok, serverError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return badRequest("email is required");
    }

    const domain = body.email.split("@")[1].toLowerCase();
    const providers = await prisma.identityProvider.findMany({
      where: { enabled: true, providerType: "saml" },
      select: { id: true, organisationId: true, name: true, ssoUrl: true, domainsJson: true, metadataJson: true },
    });

    for (const provider of providers) {
      const domains = Array.isArray(provider.domainsJson) ? provider.domainsJson : [];
      const matched = domains.some((entry) => typeof entry === "string" && entry.toLowerCase() === domain);
      if (!matched) continue;

      const metadata =
        provider.metadataJson && typeof provider.metadataJson === "object" && !Array.isArray(provider.metadataJson)
          ? (provider.metadataJson as Record<string, unknown>)
          : {};

      return ok({
        matched: true,
        provider: {
          id: provider.id,
          organisation_id: provider.organisationId,
          name: provider.name,
          sso_url: provider.ssoUrl,
          clerk_sso_identifier:
            typeof metadata.clerk_sso_identifier === "string" ? metadata.clerk_sso_identifier : null,
        },
      });
    }

    return notFound("No SAML identity provider configured for this email domain");
  } catch (error) {
    return serverError(error);
  }
}

