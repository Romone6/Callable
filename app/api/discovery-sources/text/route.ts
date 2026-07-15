import { SourceStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { sourceTextSchema } from "@/lib/schemas";
import { parseSource } from "@/lib/source-parser";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const { organisationId, userId, user } = await getDevContext();
    requirePermission(user.role, "discovery:manage");
    const parsed = sourceTextSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest("Invalid discovery source payload", parsed.error.flatten());
    }

    const parseResult = parseSource(parsed.data.type, parsed.data.raw_text);

    const source = await prisma.discoverySource.create({
      data: {
        organisationId,
        appId: parsed.data.app_id,
        type: parsed.data.type,
        name: parsed.data.name,
        rawText: parsed.data.raw_text,
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
