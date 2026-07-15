import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { notFound, ok, serverError } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await getDevContext();
    const { id } = await params;

    const log = await prisma.auditLog.findFirst({ where: { id, organisationId } });
    if (!log) return notFound("Audit log not found");

    return ok({ log });
  } catch (error) {
    return serverError(error);
  }
}

