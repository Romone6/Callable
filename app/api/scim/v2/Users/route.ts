import { prisma } from "@/lib/db";
import { badRequest, forbidden, ok } from "@/lib/http";
import { authenticateScimRequest } from "@/lib/scim-auth";

function toScimUser(user: {
  id: string;
  externalId: string | null;
  email: string;
  name: string;
  role: string;
}) {
  const parts = user.name.split(" ");
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    externalId: user.externalId ?? undefined,
    userName: user.email,
    name: {
      givenName: parts[0] ?? user.name,
      familyName: parts.slice(1).join(" ") || undefined,
      formatted: user.name,
    },
    emails: [{ value: user.email, primary: true }],
    active: true,
    "urn:verblayer:params:scim:schemas:extension:1.0:User": {
      role: user.role,
    },
  };
}

export async function GET(request: Request) {
  try {
    const { organisationId } = await authenticateScimRequest(request);
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter");
    const startIndex = Number(url.searchParams.get("startIndex") ?? "1");
    const count = Number(url.searchParams.get("count") ?? "100");

    const where: { organisationId: string; email?: string; externalId?: string } = { organisationId };
    if (filter) {
      const matchEmail = filter.match(/^userName eq "([^"]+)"$/);
      const matchExternalId = filter.match(/^externalId eq "([^"]+)"$/);
      if (matchEmail) where.email = matchEmail[1];
      if (matchExternalId) where.externalId = matchExternalId[1];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: Math.max(startIndex - 1, 0),
      take: Math.max(Math.min(count, 200), 1),
    });

    return ok({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
      totalResults: users.length,
      startIndex,
      itemsPerPage: users.length,
      Resources: users.map(toScimUser),
    });
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Unauthorized");
  }
}

export async function POST(request: Request) {
  try {
    const { organisationId } = await authenticateScimRequest(request);
    const body = await request.json();
    if (typeof body.userName !== "string") {
      return badRequest("SCIM userName is required");
    }

    const givenName = typeof body.name?.givenName === "string" ? body.name.givenName : "";
    const familyName = typeof body.name?.familyName === "string" ? body.name.familyName : "";
    const fullName = `${givenName} ${familyName}`.trim() || body.userName;
    const role =
      typeof body["urn:verblayer:params:scim:schemas:extension:1.0:User"]?.role === "string"
        ? body["urn:verblayer:params:scim:schemas:extension:1.0:User"].role
        : "viewer";

    const user = await prisma.user.create({
      data: {
        organisationId,
        email: body.userName,
        name: fullName,
        role,
        externalId: typeof body.externalId === "string" ? body.externalId : null,
      },
    });

    return ok(toScimUser(user), 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return forbidden(error.message);
    }
    return badRequest("Unable to provision SCIM user", error instanceof Error ? error.message : String(error));
  }
}
