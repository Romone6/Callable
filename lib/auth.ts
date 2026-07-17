import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type RequestContext = {
  userId: string;
  organisationId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export type TrustedProxyIdentity = {
  organisationSlug: string;
  email: string;
};

const proxySecretHeader = "x-callable-auth-secret";
const proxyOrganisationHeader = "x-callable-org";
const proxyEmailHeader = "x-callable-email";

function secretsMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validateTrustedProxyIdentity(requestHeaders: Headers, expectedSecret: string): TrustedProxyIdentity {
  const receivedSecret = requestHeaders.get(proxySecretHeader);
  const organisationSlug = requestHeaders.get(proxyOrganisationHeader)?.trim();
  const email = requestHeaders.get(proxyEmailHeader)?.trim().toLowerCase();

  if (!receivedSecret || !secretsMatch(receivedSecret, expectedSecret)) {
    throw new Error("Trusted proxy authentication failed.");
  }

  if (!organisationSlug || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Trusted proxy identity is incomplete.");
  }

  return { organisationSlug, email };
}

/**
 * The public core deliberately has no hosted identity provider. Local access is
 * enabled only for development and test environments, and always resolves an
 * actual persisted user/workspace pair.
 */
export async function getRequestContext(): Promise<RequestContext> {
  if (env.AUTH_MODE === "trusted_proxy") {
    const identity = validateTrustedProxyIdentity(await headers(), env.TRUSTED_AUTH_PROXY_SECRET ?? "");
    const user = await prisma.user.findFirst({
      where: {
        email: identity.email,
        organisation: { slug: identity.organisationSlug },
      },
    });

    if (!user) {
      throw new Error("Trusted proxy identity is not provisioned for this workspace.");
    }

    return {
      userId: user.id,
      organisationId: user.organisationId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  if (!env.DEV_AUTH_ENABLED || env.NODE_ENV === "production") {
    throw new Error("Console authentication is disabled. Use a trusted identity proxy in production, or enable local auth outside production.");
  }

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No local user found. Run `pnpm prisma:seed` first.");
  }

  return {
    userId: user.id,
    organisationId: user.organisationId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export const getDevContext = getRequestContext;
