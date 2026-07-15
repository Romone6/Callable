import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createScimToken } from "@/app/api/sso/scim-tokens/route";
import { DELETE as revokeScimToken } from "@/app/api/sso/scim-tokens/[id]/route";
import { GET as listScimUsers, POST as createScimUser } from "@/app/api/scim/v2/Users/route";
import { DELETE as deleteScimUser, PATCH as patchScimUser } from "@/app/api/scim/v2/Users/[id]/route";

const prisma = new PrismaClient();

let organisationId = "";
let scimTokenId = "";
let scimTokenPlaintext = "";
let createdUserId = "";

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No development user found. Run seed first.");
  }
  organisationId = user.organisationId;
});

afterAll(async () => {
  if (createdUserId) {
    await prisma.user.deleteMany({ where: { id: createdUserId, organisationId } });
  }
  if (scimTokenId) {
    await prisma.scimToken.deleteMany({ where: { id: scimTokenId, organisationId } });
  }
  await prisma.$disconnect();
});

describe("SCIM provisioning", () => {
  it("provisions, updates, lists, and deletes users with SCIM bearer auth", async () => {
    const createTokenRes = await createScimToken(
      new Request("http://localhost:3100/api/sso/scim-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `SCIM Token ${Date.now()}` }),
      }),
    );
    expect(createTokenRes.status).toBe(201);
    const createTokenBody = await createTokenRes.json();
    scimTokenId = createTokenBody.record.id as string;
    scimTokenPlaintext = createTokenBody.token as string;
    expect(scimTokenPlaintext.startsWith("scim_")).toBe(true);

    const suffix = randomUUID().slice(0, 8);
    const scimEmail = `scim-user-${suffix}@example.com`;

    const createUserRes = await createScimUser(
      new Request("http://localhost:3100/api/scim/v2/Users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${scimTokenPlaintext}`,
        },
        body: JSON.stringify({
          userName: scimEmail,
          externalId: `scim-ext-${suffix}`,
          name: {
            givenName: "Scim",
            familyName: "User",
          },
          "urn:verblayer:params:scim:schemas:extension:1.0:User": {
            role: "reviewer",
          },
        }),
      }),
    );
    expect(createUserRes.status).toBe(201);
    const createdBody = await createUserRes.json();
    createdUserId = createdBody.id as string;

    const listRes = await listScimUsers(
      new Request(`http://localhost:3100/api/scim/v2/Users?filter=userName%20eq%20%22${encodeURIComponent(scimEmail)}%22`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${scimTokenPlaintext}`,
        },
      }),
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.Resources)).toBe(true);
    expect(listBody.Resources.some((resource: { id: string }) => resource.id === createdUserId)).toBe(true);

    const patchRes = await patchScimUser(
      new Request(`http://localhost:3100/api/scim/v2/Users/${createdUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${scimTokenPlaintext}`,
        },
        body: JSON.stringify({
          Operations: [
            {
              op: "Replace",
              path: "urn:verblayer:params:scim:schemas:extension:1.0:User:role",
              value: "admin",
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: createdUserId }) },
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody["urn:verblayer:params:scim:schemas:extension:1.0:User"].role).toBe("admin");

    const deleteRes = await deleteScimUser(
      new Request(`http://localhost:3100/api/scim/v2/Users/${createdUserId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${scimTokenPlaintext}`,
        },
      }),
      { params: Promise.resolve({ id: createdUserId }) },
    );
    expect(deleteRes.status).toBe(200);
    createdUserId = "";

    const revokeRes = await revokeScimToken(
      new Request(`http://localhost:3100/api/sso/scim-tokens/${scimTokenId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: scimTokenId }) },
    );
    expect(revokeRes.status).toBe(200);

    const unauthorizedListRes = await listScimUsers(
      new Request("http://localhost:3100/api/scim/v2/Users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${scimTokenPlaintext}`,
        },
      }),
    );
    expect(unauthorizedListRes.status).toBe(403);
  });
});
