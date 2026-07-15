import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptJson, encryptJson, type EncryptedPayload } from "@/lib/crypto";

function secretPayload(secret: string) {
  return { secret };
}

function decryptSecret(cipherJson: Prisma.JsonValue) {
  if (!cipherJson || typeof cipherJson !== "object" || Array.isArray(cipherJson)) {
    throw new Error("Invalid signing key payload");
  }
  const encrypted = cipherJson as unknown as EncryptedPayload;
  return decryptJson<{ secret: string }>(encrypted, env.CONNECTOR_CREDENTIALS_KEY).secret;
}

async function createSigningKeyRecord(organisationId: string, plaintextSecret?: string) {
  const keyId = `esk_${randomBytes(8).toString("hex")}`;
  const secret = plaintextSecret ?? randomBytes(32).toString("base64url");
  const keyCipherJson = encryptJson(secretPayload(secret), env.CONNECTOR_CREDENTIALS_KEY) as unknown as Prisma.InputJsonValue;

  return prisma.exportSigningKey.create({
    data: {
      organisationId,
      keyId,
      keyCipherJson,
      isActive: true,
    },
  });
}

export async function getActiveExportSigningKey(organisationId: string) {
  let key = await prisma.exportSigningKey.findFirst({
    where: {
      organisationId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!key) {
    key = await createSigningKeyRecord(organisationId, env.EXPORT_SIGNING_KEY_BOOTSTRAP || undefined);
  }

  return {
    id: key.id,
    keyId: key.keyId,
    secret: decryptSecret(key.keyCipherJson),
    createdAt: key.createdAt,
  };
}

export async function rotateExportSigningKey(organisationId: string) {
  await prisma.exportSigningKey.updateMany({
    where: { organisationId, isActive: true },
    data: { isActive: false, rotatedAt: new Date() },
  });
  const record = await createSigningKeyRecord(organisationId);
  return {
    id: record.id,
    keyId: record.keyId,
    createdAt: record.createdAt,
  };
}

export async function listExportSigningKeys(organisationId: string) {
  return prisma.exportSigningKey.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      keyId: true,
      isActive: true,
      createdAt: true,
      rotatedAt: true,
    },
  });
}
