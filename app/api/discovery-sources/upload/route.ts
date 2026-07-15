import { SourceStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { parseSource } from "@/lib/source-parser";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

const supportedTypes = new Set([
  "sop_document",
  "csv_ticket_export",
  "json_browser_trace",
  "openapi_schema",
  "playwright_trace",
  "manual_process_text",
]);

export async function POST(request: Request) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "discovery:manage");
    const formData = await request.formData();

    const file = formData.get("file");
    const name = String(formData.get("name") ?? "uploaded-source");
    const type = String(formData.get("type") ?? "manual_process_text");
    const appId = (formData.get("app_id") as string | null) ?? undefined;

    if (!(file instanceof File)) {
      return badRequest("file is required");
    }

    if (!supportedTypes.has(type)) {
      return badRequest("Unsupported source type");
    }

    const rawText = await file.text();
    const parseResult = parseSource(type, rawText);

    const source = await prisma.discoverySource.create({
      data: {
        organisationId,
        appId,
        type: type as never,
        name,
        rawText,
        fileUrl: `local://${file.name}`,
        parsedJson: (parseResult.parsedJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        status: parseResult.status === "parsed" ? SourceStatus.parsed : SourceStatus.parse_failed,
        errorMessage: parseResult.errorMessage,
      },
    });

    await writeAuditLog({
      organisationId,
      eventType: "source_uploaded",
      actorType: "user",
      actorId: userId,
      details: {
        source_id: source.id,
        source_type: source.type,
        source_name: name,
        status: source.status,
      },
    });

    return ok({ source }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
