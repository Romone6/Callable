import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "scim:manage");
    const { id } = await params;
    const token = await prisma.scimToken.findFirst({ where: { id, organisationId } });
    if (!token) return notFound("SCIM token not found");

    await prisma.scimToken.update({ where: { id }, data: { revokedAt: new Date() } });
    return ok({ revoked: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) return forbidden(error.message);
    return serverError(error);
  }
}

