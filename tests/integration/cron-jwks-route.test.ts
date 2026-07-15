import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair } from "jose";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { GET as listCronJwks, POST as rotateCronJwks } from "@/app/api/security/cron-jwks/route";

const prisma = new PrismaClient();
let organisationId = "";
let userId = "";
const createdKeyIds: string[] = [];

async function rsaPublicJwk(kid: string) {
  const { publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  return {
    ...publicJwk,
    kid,
    alg: "RS256",
    use: "sig",
  };
}

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Cron Jwks Org ${suffix}`,
      slug: `cron-jwks-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const user = await prisma.user.create({
    data: {
      organisationId,
      email: `cron-jwks-${suffix}@example.com`,
      name: "Cron JWKS Owner",
      role: "owner",
    },
  });
  userId = user.id;
});

beforeEach(() => {
  vi.mocked(getDevContext).mockResolvedValue({
    organisationId,
    userId,
    user: {
      id: userId,
      email: "cron-jwks@example.com",
      name: "Cron JWKS Owner",
      role: "owner",
    },
  });
});

afterAll(async () => {
  if (createdKeyIds.length > 0) {
    await prisma.cronJwksKey.deleteMany({ where: { keyId: { in: createdKeyIds } } });
  }
  await prisma.auditLog.deleteMany({ where: { organisationId, eventType: "cron_jwks_rotated" } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("cron jwks admin routes", () => {
  it("rotates active key to grace and promotes new key to active", async () => {
    const firstKid = `cron-jwks-a-${Date.now()}`;
    createdKeyIds.push(firstKid);
    const firstRes = await rotateCronJwks(
      new Request("http://localhost/api/security/cron-jwks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jwk: await rsaPublicJwk(firstKid),
          grace_window_minutes: 15,
        }),
      }),
    );
    expect(firstRes.status).toBe(201);

    const secondKid = `cron-jwks-b-${Date.now()}`;
    createdKeyIds.push(secondKid);
    const secondRes = await rotateCronJwks(
      new Request("http://localhost/api/security/cron-jwks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jwk: await rsaPublicJwk(secondKid),
          grace_window_minutes: 30,
        }),
      }),
    );
    expect(secondRes.status).toBe(201);

    const listRes = await listCronJwks();
    expect(listRes.status).toBe(200);
    const body = await listRes.json();
    expect(Array.isArray(body.keys)).toBe(true);

    const active = body.keys.find((key: { key_id: string; status: string }) => key.key_id === secondKid);
    expect(active?.status).toBe("active");

    const grace = body.keys.find((key: { key_id: string; status: string; grace_until: string | null }) => key.key_id === firstKid);
    expect(grace?.status).toBe("grace");
    expect(typeof grace?.grace_until).toBe("string");
  });

  it("rejects private key fields in submitted JWK payload", async () => {
    const kid = `cron-jwks-invalid-${Date.now()}`;
    const publicJwk = await rsaPublicJwk(kid);
    const res = await rotateCronJwks(
      new Request("http://localhost/api/security/cron-jwks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jwk: {
            ...publicJwk,
            d: "should-not-be-present",
          },
        }),
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad_request");
  });
});
