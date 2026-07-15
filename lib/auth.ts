import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { assertSessionSecurityPolicy, getEffectiveSecurityPolicy } from "@/lib/security-policy";
import { registerCustomRolePermissions, sanitizePermissions } from "@/lib/permissions";

type RequestContext = {
  userId: string;
  organisationId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

async function resolveUserRole(organisationId: string, role: string) {
  if (!role.startsWith("custom:")) {
    return role;
  }

  const roleKey = role.slice("custom:".length);
  if (!roleKey) {
    return "viewer";
  }

  const customRole = await prisma.customRole.findFirst({
    where: {
      organisationId,
      roleKey,
    },
  });

  if (!customRole) {
    return "viewer";
  }

  const permissions = sanitizePermissions(customRole.permissionsJson);
  registerCustomRolePermissions(role, permissions);
  return role;
}

async function getLocalDevContext(): Promise<RequestContext> {
  const user = await prisma.user.findFirst({ include: { organisation: true } });
  if (!user) {
    throw new Error("No development user found. Run seed first.");
  }

  const resolvedRole = await resolveUserRole(user.organisationId, user.role);

  return {
    userId: user.id,
    organisationId: user.organisationId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: resolvedRole,
    },
  };
}

async function getOrCreateClerkWorkspace(): Promise<RequestContext> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Unauthorized: no signed-in user.");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unable to load Clerk user profile.");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? `${session.userId}@clerk.local`;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "Clerk User";

  let dbUser = await prisma.user.findFirst({
    where: { clerkUserId: session.userId },
    include: { organisation: true },
  });

  if (!dbUser) {
    const slugBase =
      (clerkUser.username ?? name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "workspace";

    let organisation = session.orgId
      ? await prisma.organisation.findFirst({ where: { clerkOrgId: session.orgId } })
      : null;

    if (!organisation) {
      organisation = await prisma.organisation.create({
        data: {
          name: `${name} Workspace`,
          slug: `${slugBase}-${Date.now()}`,
          plan: "starter",
          clerkOrgId: session.orgId ?? null,
        },
      });
    }

    dbUser = await prisma.user.create({
      data: {
        organisationId: organisation.id,
        email,
        name,
        role: "owner",
        clerkUserId: session.userId,
      },
      include: { organisation: true },
    });
  }

  if (session.orgId && dbUser.organisation.clerkOrgId !== session.orgId) {
    const org = await prisma.organisation.findFirst({ where: { clerkOrgId: session.orgId } });
    if (org) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { organisationId: org.id },
        include: { organisation: true },
      });
    } else {
      await prisma.organisation.update({
        where: { id: dbUser.organisationId },
        data: { clerkOrgId: session.orgId },
      });
      dbUser = await prisma.user.findFirstOrThrow({ where: { id: dbUser.id }, include: { organisation: true } });
    }
  }

  const policy = await getEffectiveSecurityPolicy(dbUser.organisationId);
  assertSessionSecurityPolicy({
    session_timeout_minutes: policy.session_timeout_minutes,
    require_mfa: policy.require_mfa,
    session_claims: (session as { sessionClaims?: Record<string, unknown> }).sessionClaims,
  });

  const resolvedRole = await resolveUserRole(dbUser.organisationId, dbUser.role);

  return {
    userId: dbUser.id,
    organisationId: dbUser.organisationId,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: resolvedRole,
    },
  };
}

export async function getRequestContext(): Promise<RequestContext> {
  if (env.AUTH_MODE === "clerk") {
    return getOrCreateClerkWorkspace();
  }
  return getLocalDevContext();
}

// Backwards-compatible alias used across handlers/pages.
export async function getDevContext(): Promise<RequestContext> {
  return getRequestContext();
}
