import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { GET as getSecurityPolicy, PATCH as patchSecurityPolicy } from "@/app/api/security/policy/route";
import { requireApiKey } from "@/lib/api-key-auth";

const prisma = new PrismaClient();

let organisationId = "";
let userId = "";
let apiKeyId = "";
const plainToken = `vk_${randomUUID().replace(/-/g, "")}`;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Security Policy Org ${suffix}`,
      slug: `security-policy-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `security-policy-${suffix}@example.com`,
      name: "Security Owner",
      role: "owner",
    },
  });
  userId = user.id;

  const apiKey = await prisma.apiKey.create({
    data: {
      organisationId,
      name: "Policy test key",
      keyHash: sha256(plainToken),
      scopesJson: ["commands:read", "commands:run", "executions:read", "audit:read"],
    },
  });
  apiKeyId = apiKey.id;
});

beforeEach(() => {
  vi.mocked(getDevContext).mockResolvedValue({
    organisationId,
    userId,
    user: {
      id: userId,
      email: "security-owner@example.com",
      name: "Security Owner",
      role: "owner",
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.organisationSecurityPolicy.deleteMany({ where: { organisationId } });
  await prisma.apiKey.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("security policy route + API key policy enforcement", () => {
  it("returns defaults and applies policy updates", async () => {
    const getRes = await getSecurityPolicy();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.policy.api_key_ttl_days).toBe(90);
    expect(Array.isArray(getBody.policy.ip_allowlist)).toBe(true);

    const patchRes = await patchSecurityPolicy(
      new Request("http://localhost/api/security/policy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_timeout_minutes: 120,
          api_key_ttl_days: 30,
          require_mfa: true,
          ip_allowlist: ["203.0.113.9"],
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.policy.require_mfa).toBe(true);
    expect(patchBody.policy.ip_allowlist).toEqual(["203.0.113.9"]);
  });

  it("enforces API key IP allowlist and TTL policy", async () => {
    await patchSecurityPolicy(
      new Request("http://localhost/api/security/policy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_timeout_minutes: 120,
          api_key_ttl_days: 1,
          require_mfa: false,
          ip_allowlist: ["198.51.100.0/24"],
        }),
      }),
    );

    await expect(
      requireApiKey(
        new Request("http://localhost/api/agent/commands", {
          headers: {
            authorization: `Bearer ${plainToken}`,
            "x-forwarded-for": "198.51.101.11",
          },
        }),
        ["commands:read"],
      ),
    ).rejects.toThrow(/allowlist/i);

    const authorized = await requireApiKey(
      new Request("http://localhost/api/agent/commands", {
        headers: {
          authorization: `Bearer ${plainToken}`,
          "x-forwarded-for": "198.51.100.10",
        },
      }),
      ["commands:read"],
    );
    expect(authorized.apiKeyId).toBe(apiKeyId);

    const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        createdAt: oldDate,
      },
    });

    await expect(
      requireApiKey(
        new Request("http://localhost/api/agent/commands", {
          headers: {
            authorization: `Bearer ${plainToken}`,
            "x-forwarded-for": "198.51.100.10",
          },
        }),
        ["commands:read"],
      ),
    ).rejects.toThrow(/expired/i);
  });
});
