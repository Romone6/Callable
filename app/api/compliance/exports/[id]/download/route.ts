import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { forbidden, notFound, serverError } from "@/lib/http";
import { readComplianceArtifact } from "@/lib/compliance-artifacts";
import { requirePermission } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId, user } = await getDevContext();
    const { id } = await params;

    const exportRecord = await prisma.complianceExport.findFirst({
      where: { id, organisationId },
    });

    if (!exportRecord) return notFound("Compliance export not found");

    if (exportRecord.resource === "audit_logs") requirePermission(user.role, "audit:read");
    if (exportRecord.resource === "approvals") requirePermission(user.role, "approvals:read");
    if (exportRecord.resource === "executions") requirePermission(user.role, "executions:read");

    const payload = await readComplianceArtifact(exportRecord.artifactPath);
    const filename = `${exportRecord.resource}_${exportRecord.id}.${exportRecord.format}`;

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "content-type": exportRecord.format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "content-disposition": `attachment; filename=\"${filename}\"`,
        "x-export-signature": exportRecord.signature,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
