import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { loadComplianceRows } from "@/lib/compliance-data";
import { normalizeDateRange, rowsToCsv, signExportPayload, type ComplianceResource } from "@/lib/compliance";
import { createComplianceExportSchema } from "@/lib/schemas";
import { getActiveExportSigningKey } from "@/lib/export-signing-keys";
import { writeComplianceArtifact } from "@/lib/compliance-artifacts";
import { requirePermission } from "@/lib/permissions";

type ExportFormat = "json" | "csv";

function asResource(value: string | null): ComplianceResource | undefined {
  if (value === "audit_logs" || value === "approvals" || value === "executions") return value;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const { organisationId, user } = await getDevContext();
    const url = new URL(request.url);
    const resource = asResource(url.searchParams.get("resource"));
    if (resource === "audit_logs") requirePermission(user.role, "audit:read");
    if (resource === "approvals") requirePermission(user.role, "approvals:read");
    if (resource === "executions") requirePermission(user.role, "executions:read");
    if (!resource) requirePermission(user.role, "audit:read");

    const exports = await prisma.complianceExport.findMany({
      where: {
        organisationId,
        resource: resource ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        resource: true,
        format: true,
        rowCount: true,
        fromDate: true,
        toDate: true,
        signature: true,
        createdAt: true,
        signingKey: {
          select: {
            keyId: true,
          },
        },
      },
    });

    return ok({
      exports: exports.map((item) => ({
        id: item.id,
        resource: item.resource,
        format: item.format,
        row_count: item.rowCount,
        from: item.fromDate?.toISOString() ?? null,
        to: item.toDate?.toISOString() ?? null,
        signature: item.signature,
        key_id: item.signingKey.keyId,
        created_at: item.createdAt.toISOString(),
        download_url: `/api/compliance/exports/${item.id}/download`,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId, user, userId } = await getDevContext();
    const parsed = createComplianceExportSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Invalid compliance export payload", parsed.error.flatten());
    }

    const { from, to } = normalizeDateRange(parsed.data.from ?? null, parsed.data.to ?? null);

    const rows = await loadComplianceRows({
      organisationId,
      resource: parsed.data.resource,
      actor: { role: user.role },
      from,
      to,
      limit: parsed.data.limit,
    });

    const format = parsed.data.format as ExportFormat;
    const payload = format === "csv" ? rowsToCsv(rows) : JSON.stringify(rows, null, 2);

    const signingKey = await getActiveExportSigningKey(organisationId);
    const signature = signExportPayload(payload, signingKey.secret);
    const artifactPath = await writeComplianceArtifact({
      organisationId,
      resource: parsed.data.resource,
      format,
      payload,
    });

    const exportRecord = await prisma.complianceExport.create({
      data: {
        organisationId,
        resource: parsed.data.resource,
        format,
        rowCount: rows.length,
        fromDate: from,
        toDate: to,
        signature,
        signatureKeyId: signingKey.id,
        artifactPath,
        createdBy: userId,
      },
      include: {
        signingKey: {
          select: {
            keyId: true,
          },
        },
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "compliance_export_created",
      actorType: "user",
      actorId: userId,
      details: {
        export_id: exportRecord.id,
        resource: exportRecord.resource,
        format: exportRecord.format,
        row_count: exportRecord.rowCount,
      },
    });

    return ok(
      {
        export: {
          id: exportRecord.id,
          resource: exportRecord.resource,
          format: exportRecord.format,
          row_count: exportRecord.rowCount,
          from: exportRecord.fromDate?.toISOString() ?? null,
          to: exportRecord.toDate?.toISOString() ?? null,
          signature: exportRecord.signature,
          key_id: exportRecord.signingKey.keyId,
          created_at: exportRecord.createdAt.toISOString(),
          download_url: `/api/compliance/exports/${exportRecord.id}/download`,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    if (error instanceof Error && error.message.toLowerCase().includes("invalid")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
