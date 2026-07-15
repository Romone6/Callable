import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listIdentityProviders, POST as createIdentityProvider } from "@/app/api/sso/identity-providers/route";
import { DELETE as deleteIdentityProvider, PATCH as patchIdentityProvider } from "@/app/api/sso/identity-providers/[id]/route";
import { POST as discoverSamlProvider } from "@/app/api/auth/sso/saml/discover/route";

const prisma = new PrismaClient();

let organisationId = "";
let providerId = "";

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No development user found. Run seed first.");
  }
  organisationId = user.organisationId;
});

afterAll(async () => {
  if (providerId) {
    await prisma.identityProvider.deleteMany({ where: { id: providerId, organisationId } });
  }
  await prisma.$disconnect();
});

describe("SAML SSO discovery", () => {
  it("creates identity provider and resolves email-domain discovery", async () => {
    const suffix = randomUUID().slice(0, 8);
    const domain = `sso-${suffix}.example.com`;

    const createRes = await createIdentityProvider(
      new Request("http://localhost:3100/api/sso/identity-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `SAML ${suffix}`,
          provider_type: "saml",
          issuer: `https://issuer.${domain}`,
          sso_url: `https://login.${domain}/saml`,
          domains: [domain],
          metadata: { clerk_sso_identifier: `clerk-${suffix}` },
          enabled: true,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    providerId = createBody.provider.id as string;

    const listRes = await listIdentityProviders();
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.providers)).toBe(true);
    expect(listBody.providers.some((provider: { id: string }) => provider.id === providerId)).toBe(true);

    const discoverMatchRes = await discoverSamlProvider(
      new Request("http://localhost:3100/api/auth/sso/saml/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `agent@${domain}` }),
      }),
    );
    expect(discoverMatchRes.status).toBe(200);
    const discoverBody = await discoverMatchRes.json();
    expect(discoverBody.matched).toBe(true);
    expect(discoverBody.provider.id).toBe(providerId);

    const patchRes = await patchIdentityProvider(
      new Request(`http://localhost:3100/api/sso/identity-providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }),
      { params: Promise.resolve({ id: providerId }) },
    );
    expect(patchRes.status).toBe(200);

    const discoverNoMatchRes = await discoverSamlProvider(
      new Request("http://localhost:3100/api/auth/sso/saml/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `agent@${domain}` }),
      }),
    );
    expect(discoverNoMatchRes.status).toBe(404);

    const deleteRes = await deleteIdentityProvider(
      new Request(`http://localhost:3100/api/sso/identity-providers/${providerId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: providerId }) },
    );
    expect(deleteRes.status).toBe(200);
    providerId = "";
  });
});
