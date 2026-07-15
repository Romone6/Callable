import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { GET as getRoles, POST as createRole } from "@/app/api/security/roles/route";
import { PATCH as updateRole, DELETE as deleteRole } from "@/app/api/security/roles/[roleKey]/route";
import { POST as assignRole } from "@/app/api/security/roles/assign/route";

const prisma = new PrismaClient();

let organisationId = "";
let ownerUserId = "";
let targetUserId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Custom Role Org ${suffix}`,
      slug: `custom-role-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const owner = await prisma.user.create({
    data: {
      organisationId,
      email: `owner-${suffix}@example.com`,
      name: "Role Owner",
      role: "owner",
    },
  });
  ownerUserId = owner.id;

  const target = await prisma.user.create({
    data: {
      organisationId,
      email: `member-${suffix}@example.com`,
      name: "Role Member",
      role: "viewer",
    },
  });
  targetUserId = target.id;
});

beforeEach(() => {
  vi.mocked(getDevContext).mockResolvedValue({
    organisationId,
    userId: ownerUserId,
    user: {
      id: ownerUserId,
      email: "owner@example.com",
      name: "Role Owner",
      role: "owner",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.customRole.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("custom roles API", () => {
  it("creates, lists, updates, assigns, and deletes custom roles", async () => {
    const createRes = await createRole(
      new Request("http://localhost/api/security/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role_key: "incident_reviewer",
          name: "Incident Reviewer",
          permissions: ["executions:read", "drift:read", "approvals:read"],
        }),
      }),
    );
    expect(createRes.status).toBe(201);

    const listRes = await getRoles();
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.custom_roles)).toBe(true);
    expect(listBody.custom_roles.some((role: { role_key: string }) => role.role_key === "incident_reviewer")).toBe(true);

    const updateRes = await updateRole(
      new Request("http://localhost/api/security/roles/incident_reviewer", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Incident Reviewer Updated",
          permissions: ["executions:read", "drift:read"],
        }),
      }),
      { params: Promise.resolve({ roleKey: "incident_reviewer" }) },
    );
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.role.name).toBe("Incident Reviewer Updated");

    const assignRes = await assignRole(
      new Request("http://localhost/api/security/roles/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: targetUserId,
          role: "custom:incident_reviewer",
        }),
      }),
    );
    expect(assignRes.status).toBe(200);
    const assigned = await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
    expect(assigned.role).toBe("custom:incident_reviewer");

    const deleteRes = await deleteRole(new Request("http://localhost/api/security/roles/incident_reviewer", { method: "DELETE" }), {
      params: Promise.resolve({ roleKey: "incident_reviewer" }),
    });
    expect(deleteRes.status).toBe(200);

    const downgraded = await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
    expect(downgraded.role).toBe("viewer");
  });
});
