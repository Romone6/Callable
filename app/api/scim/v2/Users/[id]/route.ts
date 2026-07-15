import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound, ok } from "@/lib/http";
import { authenticateScimRequest } from "@/lib/scim-auth";

function splitName(name: string) {
  const parts = name.split(" ");
  return {
    givenName: parts[0] ?? name,
    familyName: parts.slice(1).join(" ") || undefined,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await authenticateScimRequest(request);
    const { id } = await params;
    const user = await prisma.user.findFirst({ where: { id, organisationId } });
    if (!user) return notFound("SCIM user not found");

    return ok({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: user.id,
      externalId: user.externalId ?? undefined,
      userName: user.email,
      name: {
        ...splitName(user.name),
        formatted: user.name,
      },
      emails: [{ value: user.email, primary: true }],
      active: true,
      "urn:verblayer:params:scim:schemas:extension:1.0:User": {
        role: user.role,
      },
    });
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Unauthorized");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await authenticateScimRequest(request);
    const { id } = await params;
    const existing = await prisma.user.findFirst({ where: { id, organisationId } });
    if (!existing) return notFound("SCIM user not found");
    const body = await request.json();

    const operations = Array.isArray(body.Operations) ? body.Operations : [];
    let email = existing.email;
    let name = existing.name;
    let role = existing.role;
    let externalId = existing.externalId;

    for (const operation of operations) {
      if (!operation || typeof operation !== "object") continue;
      const op = String(operation.op ?? "").toLowerCase();
      const path = typeof operation.path === "string" ? operation.path : "";
      const value = operation.value;
      if (op !== "replace") continue;

      if (!path && value && typeof value === "object") {
        const v = value as Record<string, unknown>;
        if (typeof v.userName === "string") email = v.userName;
        if (typeof v.externalId === "string") externalId = v.externalId;
        if (typeof v.name === "object" && v.name && !Array.isArray(v.name)) {
          const n = v.name as Record<string, unknown>;
          const given = typeof n.givenName === "string" ? n.givenName : "";
          const family = typeof n.familyName === "string" ? n.familyName : "";
          const full = `${given} ${family}`.trim();
          if (full) name = full;
        }
      }

      if (path === "userName" && typeof value === "string") email = value;
      if (path === "externalId" && typeof value === "string") externalId = value;
      if (path === "name.givenName" && typeof value === "string") {
        const family = splitName(name).familyName ?? "";
        name = `${value} ${family}`.trim();
      }
      if (path === "name.familyName" && typeof value === "string") {
        const given = splitName(name).givenName;
        name = `${given} ${value}`.trim();
      }
      if (path === "urn:verblayer:params:scim:schemas:extension:1.0:User:role" && typeof value === "string") {
        role = value;
      }
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        name,
        role,
        externalId,
      },
    });

    return ok({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: updated.id,
      userName: updated.email,
      externalId: updated.externalId ?? undefined,
      name: { ...splitName(updated.name), formatted: updated.name },
      emails: [{ value: updated.email, primary: true }],
      active: true,
      "urn:verblayer:params:scim:schemas:extension:1.0:User": { role: updated.role },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return forbidden(error.message);
    }
    return badRequest("Unable to patch SCIM user", error instanceof Error ? error.message : String(error));
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organisationId } = await authenticateScimRequest(request);
    const { id } = await params;
    const existing = await prisma.user.findFirst({ where: { id, organisationId } });
    if (!existing) return notFound("SCIM user not found");

    await prisma.user.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Unauthorized");
  }
}

