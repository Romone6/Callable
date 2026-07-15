import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { notFound, ok, serverError } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await getDevContext();
    const { id } = await params;

    const approval = await prisma.approval.findFirst({
      where: { id, organisationId },
      include: { execution: true, command: true },
    });

    if (!approval) return notFound("Approval not found");
    return ok({ approval });
  } catch (error) {
    return serverError(error);
  }
}

