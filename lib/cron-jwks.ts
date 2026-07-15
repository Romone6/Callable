import { CronJwksKeyStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { z } from "zod";

const privateKeyFields = new Set(["d", "p", "q", "dp", "dq", "qi", "oth", "k"]);

export class CronJwkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronJwkValidationError";
  }
}

const cronJwkSchema = z
  .object({
    kid: z.string().min(1),
    kty: z.string().min(1),
    alg: z.string().optional(),
    use: z.string().optional(),
  })
  .catchall(z.unknown());

export const rotateCronJwksSchema = z.object({
  jwk: cronJwkSchema,
  grace_window_minutes: z.number().int().min(0).max(7 * 24 * 60).default(60),
});

function assertPublicJwk(jwk: Record<string, unknown>) {
  const privateField = findPrivateJwkField(jwk);
  if (privateField) {
    throw new CronJwkValidationError(`Invalid JWK: private key field '${privateField}' is not allowed.`);
  }
}

export function findPrivateJwkField(jwk: Record<string, unknown>) {
  for (const field of privateKeyFields) {
    if (field in jwk) return field;
  }
  return null;
}

function asJwk(json: Prisma.JsonValue): Record<string, unknown> {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {};
  }
  return json as Record<string, unknown>;
}

export async function listCronJwksKeys() {
  const keys = await prisma.cronJwksKey.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return keys.map((key) => ({
    id: key.id,
    key_id: key.keyId,
    status: key.status,
    grace_until: key.graceUntil?.toISOString() ?? null,
    created_at: key.createdAt.toISOString(),
    rotated_at: key.rotatedAt?.toISOString() ?? null,
    public_jwk: asJwk(key.publicJwkJson),
  }));
}

export async function rotateCronJwksKey(input: z.infer<typeof rotateCronJwksSchema>) {
  const parsed = rotateCronJwksSchema.parse(input);
  const jwkRecord = parsed.jwk as Record<string, unknown>;
  assertPublicJwk(jwkRecord);

  const now = new Date();
  const graceUntil = new Date(now.getTime() + parsed.grace_window_minutes * 60_000);

  const result = await prisma.$transaction(async (tx) => {
    await tx.cronJwksKey.updateMany({
      where: { status: CronJwksKeyStatus.active },
      data: {
        status: CronJwksKeyStatus.grace,
        graceUntil,
        rotatedAt: now,
      },
    });

    await tx.cronJwksKey.updateMany({
      where: {
        status: CronJwksKeyStatus.grace,
        graceUntil: { lt: now },
      },
      data: {
        status: CronJwksKeyStatus.retired,
      },
    });

    return tx.cronJwksKey.upsert({
      where: { keyId: parsed.jwk.kid },
      create: {
        keyId: parsed.jwk.kid,
        publicJwkJson: parsed.jwk as unknown as Prisma.InputJsonValue,
        status: CronJwksKeyStatus.active,
        graceUntil: null,
      },
      update: {
        publicJwkJson: parsed.jwk as unknown as Prisma.InputJsonValue,
        status: CronJwksKeyStatus.active,
        graceUntil: null,
        rotatedAt: null,
      },
    });
  });

  return {
    id: result.id,
    key_id: result.keyId,
    status: result.status,
    created_at: result.createdAt.toISOString(),
  };
}

export async function getActiveAndGraceCronJwks() {
  const now = new Date();
  const keys = await prisma.cronJwksKey.findMany({
    where: {
      OR: [
        { status: CronJwksKeyStatus.active },
        {
          status: CronJwksKeyStatus.grace,
          OR: [{ graceUntil: null }, { graceUntil: { gte: now } }],
        },
      ],
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const active: Record<string, unknown>[] = [];
  const grace: Record<string, unknown>[] = [];

  for (const key of keys) {
    const parsed = asJwk(key.publicJwkJson);
    if (Object.keys(parsed).length === 0) continue;
    if (key.status === CronJwksKeyStatus.active) active.push(parsed);
    else grace.push(parsed);
  }

  return { active, grace };
}
