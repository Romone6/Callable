import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateScimRequest(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    throw new Error("Unauthorized: missing SCIM bearer token");
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Unauthorized: empty SCIM bearer token");
  }

  const tokenHash = hashToken(token);
  const scimToken = await prisma.scimToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
    },
  });
  if (!scimToken) {
    throw new Error("Unauthorized: invalid SCIM token");
  }

  await prisma.scimToken.update({
    where: { id: scimToken.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    organisationId: scimToken.organisationId,
    tokenId: scimToken.id,
  };
}

