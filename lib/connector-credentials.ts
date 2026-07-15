import type { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { decryptJson, encryptJson, type EncryptedPayload } from "@/lib/crypto";
import { asMetadataRecord } from "@/lib/connectors/metadata";

const CREDENTIALS_KEY = "credentials_encrypted";

type CredentialRecord = Record<string, string>;

type MetadataWithCredentials = Record<string, unknown> & {
  credentials_encrypted?: EncryptedPayload;
};

function getCredentialsSecret() {
  if (!env.CONNECTOR_CREDENTIALS_KEY || env.CONNECTOR_CREDENTIALS_KEY.trim().length < 16) {
    throw new Error("Connector credentials key is not configured. Set CONNECTOR_CREDENTIALS_KEY.");
  }
  return env.CONNECTOR_CREDENTIALS_KEY;
}

function parseCredentialRecord(value: Record<string, unknown>) {
  const entries = Object.entries(value)
    .filter(([, entryValue]) => typeof entryValue === "string")
    .map(([entryKey, entryValue]) => [entryKey, (entryValue as string).trim()]);
  return Object.fromEntries(entries.filter(([, entryValue]) => entryValue.length > 0));
}

export function setEncryptedCredentials(
  metadata: Prisma.JsonValue | null | undefined,
  credentials: Record<string, unknown>,
): Prisma.InputJsonValue {
  const nextMetadata = asMetadataRecord(metadata) as MetadataWithCredentials;
  const parsed = parseCredentialRecord(credentials);
  if (Object.keys(parsed).length === 0) {
    throw new Error("At least one credential value is required.");
  }

  const encrypted = encryptJson(parsed, getCredentialsSecret());
  return {
    ...nextMetadata,
    [CREDENTIALS_KEY]: encrypted,
  } as Prisma.InputJsonObject;
}

export function clearEncryptedCredentials(metadata: Prisma.JsonValue | null | undefined): Prisma.InputJsonValue {
  const nextMetadata = asMetadataRecord(metadata) as MetadataWithCredentials;
  const rest = { ...nextMetadata };
  delete rest[CREDENTIALS_KEY];
  return rest as Prisma.InputJsonObject;
}

export function hasEncryptedCredentials(metadata: Prisma.JsonValue | null | undefined): boolean {
  const value = asMetadataRecord(metadata)[CREDENTIALS_KEY];
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function getDecryptedCredentials(metadata: Prisma.JsonValue | null | undefined): CredentialRecord | null {
  const encrypted = asMetadataRecord(metadata)[CREDENTIALS_KEY];
  if (!encrypted || typeof encrypted !== "object" || Array.isArray(encrypted)) return null;
  const raw = encrypted as Partial<EncryptedPayload>;
  if (
    typeof raw.ciphertext !== "string" ||
    typeof raw.iv !== "string" ||
    typeof raw.tag !== "string" ||
    raw.alg !== "aes-256-gcm"
  ) {
    return null;
  }

  return decryptJson<CredentialRecord>(
    {
      ciphertext: raw.ciphertext,
      iv: raw.iv,
      tag: raw.tag,
      alg: "aes-256-gcm",
      v: 1,
    },
    getCredentialsSecret(),
  );
}

export function resolveCredentialValue(
  metadata: Prisma.JsonValue | null | undefined,
  credentialKey: string,
  envKeyFallback: string | null,
): string | null {
  const decrypted = getDecryptedCredentials(metadata);
  const fromEncrypted = decrypted?.[credentialKey] ?? null;
  if (fromEncrypted && fromEncrypted.length > 0) return fromEncrypted;
  if (!envKeyFallback) return null;
  return process.env[envKeyFallback] ?? null;
}
