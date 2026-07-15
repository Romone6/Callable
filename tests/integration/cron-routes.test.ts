import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { POST as runCronPurge } from "@/app/api/cron/purge-retention/route";
import { POST as runCronDrift } from "@/app/api/cron/drift-scan/route";

const prisma = new PrismaClient();
const createdKids = new Set<string>();

async function cronToken() {
  const issuer = process.env.CRON_JWT_ISSUER ?? "verblayer-scheduler";
  const audience = process.env.CRON_JWT_AUDIENCE ?? "verblayer-cron";
  const secret = new TextEncoder().encode(process.env.CRON_JWT_HS256_SECRET ?? "local-cron-jwt-secret");
  return new SignJWT({ role: "scheduler" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("scheduler")
    .setExpirationTime("5m")
    .sign(secret);
}

async function cronJwksToken(kid: string) {
  const issuer = process.env.CRON_JWT_ISSUER ?? "verblayer-scheduler";
  const audience = process.env.CRON_JWT_AUDIENCE ?? "verblayer-cron";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  const jwkWithKid = {
    ...publicJwk,
    kid,
    alg: "RS256",
    use: "sig",
  };

  await prisma.cronJwksKey.upsert({
    where: { keyId: kid },
    create: {
      keyId: kid,
      publicJwkJson: jwkWithKid,
      status: "active",
    },
    update: {
      publicJwkJson: jwkWithKid,
      status: "active",
      graceUntil: null,
    },
  });
  createdKids.add(kid);

  const token = await new SignJWT({ role: "scheduler" })
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("scheduler")
    .setExpirationTime("5m")
    .sign(privateKey);

  return token;
}

afterAll(async () => {
  if (createdKids.size > 0) {
    await prisma.cronJwksKey.deleteMany({ where: { keyId: { in: Array.from(createdKids) } } });
  }
  await prisma.$disconnect();
});

describe("cron routes", () => {
  it("rejects missing cron jwt", async () => {
    const res = await runCronPurge(new Request("http://localhost/api/cron/purge-retention", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("runs purge and drift cron with valid jwt identity", async () => {
    const token = await cronToken();

    const purgeRes = await runCronPurge(
      new Request("http://localhost/api/cron/purge-retention", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ dry_run: true, resource: "all" }),
      }),
    );
    expect(purgeRes.status).toBe(200);

    const driftRes = await runCronDrift(
      new Request("http://localhost/api/cron/drift-scan", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ max_commands: 1 }),
      }),
    );
    expect(driftRes.status).toBe(200);
    const driftBody = await driftRes.json();
    expect(typeof driftBody.enqueued).toBe("number");
  }, 60000);

  it("accepts RS256 JWT signed by active cron JWKS key", async () => {
    const token = await cronJwksToken(`cron-jwks-${Date.now()}`);

    const purgeRes = await runCronPurge(
      new Request("http://localhost/api/cron/purge-retention", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ dry_run: true, resource: "all" }),
      }),
    );

    expect(purgeRes.status).toBe(200);
  }, 60000);
});
