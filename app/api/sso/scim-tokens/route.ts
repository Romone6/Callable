import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "scim:manage");
    const tokens = await prisma.scimToken.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ tokens });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "scim:manage");
    const body = await request.json();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return badRequest("name is required");
    }

    const plaintext = `scim_${randomBytes(20).toString("hex")}`;
    const token = await prisma.scimToken.create({
      data: {
        organisationId,
        name: body.name,
        tokenHash: hashToken(plaintext),
      },
    });

    return ok({ token: plaintext, record: token }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return serverError(error);
  }
}

