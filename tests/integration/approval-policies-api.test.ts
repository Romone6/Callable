import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { GET, PATCH, POST } from "@/app/api/approval-policies/route";

const prisma = new PrismaClient();

let organisationId = "";
let ownerUserId = "";
let viewerUserId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Approval Policy Org ${suffix}`,
      slug: `approval-policy-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const owner = await prisma.user.create({
    data: {
      organisationId,
      email: `approval-owner-${suffix}@example.com`,
      name: "Approval Owner",
      role: "owner",
    },
  });
  ownerUserId = owner.id;

  const viewer = await prisma.user.create({
    data: {
      organisationId,
      email: `approval-viewer-${suffix}@example.com`,
      name: "Approval Viewer",
      role: "viewer",
    },
  });
  viewerUserId = viewer.id;
});

beforeEach(() => {
  vi.mocked(getDevContext).mockResolvedValue({
    organisationId,
    userId: ownerUserId,
    user: {
      id: ownerUserId,
      email: "owner@example.com",
      name: "Owner",
      role: "owner",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.approvalPolicy.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("approval policies API", () => {
  it("creates, lists, and updates approval policies with default exclusivity", async () => {
    const createOne = await POST(
      new Request("http://localhost/api/approval-policies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Finance Policy",
          status: "active",
          is_default: true,
          policy_json: {
            thresholds: { amount_greater_than: 200 },
            stages: [{ name: "finance_review", required_role: "admin", amount_greater_than: 200 }],
          },
        }),
      }),
    );
    expect(createOne.status).toBe(201);
    const bodyOne = await createOne.json();
    const firstId = bodyOne.approval_policy.id as string;

    const createTwo = await POST(
      new Request("http://localhost/api/approval-policies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Escalation Policy",
          status: "active",
          is_default: true,
          policy_json: {
            thresholds: { amount_greater_than: 500 },
            stages: [{ name: "escalation", required_role: "owner", amount_greater_than: 500 }],
          },
        }),
      }),
    );
    expect(createTwo.status).toBe(201);
    const bodyTwo = await createTwo.json();
    const secondId = bodyTwo.approval_policy.id as string;

    const list = await GET();
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(Array.isArray(listBody.approval_policies)).toBe(true);
    const first = listBody.approval_policies.find((item: { id: string }) => item.id === firstId);
    const second = listBody.approval_policies.find((item: { id: string }) => item.id === secondId);
    expect(first.is_default).toBe(false);
    expect(second.is_default).toBe(true);

    const patch = await PATCH(
      new Request("http://localhost/api/approval-policies", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: firstId,
          status: "paused",
          is_default: true,
        }),
      }),
    );
    expect(patch.status).toBe(200);
    const patchedBody = await patch.json();
    expect(patchedBody.approval_policy.status).toBe("paused");
    expect(patchedBody.approval_policy.is_default).toBe(true);

    const refreshed = await GET();
    const refreshedBody = await refreshed.json();
    const firstRefreshed = refreshedBody.approval_policies.find((item: { id: string }) => item.id === firstId);
    const secondRefreshed = refreshedBody.approval_policies.find((item: { id: string }) => item.id === secondId);
    expect(firstRefreshed.is_default).toBe(true);
    expect(secondRefreshed.is_default).toBe(false);
  });

  it("blocks non-admin policy writes", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId,
      userId: viewerUserId,
      user: {
        id: viewerUserId,
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const createRes = await POST(
      new Request("http://localhost/api/approval-policies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Blocked Policy",
          status: "active",
          is_default: false,
          policy_json: { thresholds: { amount_greater_than: 100 } },
        }),
      }),
    );
    expect(createRes.status).toBe(403);
  });
});
