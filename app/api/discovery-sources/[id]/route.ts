import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { notFound, ok, serverError } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await getDevContext();
    const { id } = await params;

    const source = await prisma.discoverySource.findFirst({
      where: { id, organisationId },
    });

    if (!source) return notFound("Discovery source not found");
    return ok({ source });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await getDevContext();
    const { id } = await params;

    const source = await prisma.discoverySource.findFirst({ where: { id, organisationId } });
    if (!source) return notFound("Discovery source not found");

    await prisma.discoverySource.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return serverError(error);
  }
}

