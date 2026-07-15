import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_LENGTH = 12;
const ALGO = "aes-256-gcm";

function normalizeKey(raw: string) {
  // Deterministically derive a 32-byte key from configured secret text.
  return createHash("sha256").update(raw, "utf8").digest();
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
  alg: "aes-256-gcm";
  v: 1;
};

export function encryptJson(payload: Record<string, unknown>, secret: string): EncryptedPayload {
  const key = normalizeKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    alg: "aes-256-gcm",
    v: 1,
  };
}

export function decryptJson<T extends Record<string, unknown>>(encrypted: EncryptedPayload, secret: string): T {
  const key = normalizeKey(secret);
  const iv = Buffer.from(encrypted.iv, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}
