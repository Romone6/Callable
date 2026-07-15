import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/http";
import { requirePermission } from "@/lib/permissions";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET() {
  try {
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "api_keys:read");
    const keys = await prisma.apiKey.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      keys: keys.map((key) => ({
        ...key,
        keyHash: `${key.keyHash.slice(0, 8)}...`,
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
    const { organisationId, user } = await getDevContext();
    requirePermission(user.role, "api_keys:manage");
    const body = await request.json();

    if (typeof body.name !== "string") {
      return badRequest("name is required");
    }

    const plaintext = `vk_${randomBytes(18).toString("hex")}`;
    const defaultScopes = ["commands:read", "commands:run", "executions:read", "audit:read"];
    const key = await prisma.apiKey.create({
      data: {
        organisationId,
        name: body.name,
        keyHash: hashKey(plaintext),
        scopesJson: Array.isArray(body.scopes) ? body.scopes : defaultScopes,
      },
    });

    return ok({ api_key: plaintext, record: key }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return forbidden(error.message);
    }
    return serverError(error);
  }
}
