import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson } from "@/lib/crypto";

describe("crypto helper", () => {
  it("encrypts and decrypts json payloads", () => {
    const payload = { auth_token: "secret", username: "ops@example.com" };
    const secret = "unit-test-connector-secret";

    const encrypted = encryptJson(payload, secret);
    expect(encrypted.alg).toBe("aes-256-gcm");
    expect(encrypted.v).toBe(1);

    const decrypted = decryptJson<typeof payload>(encrypted, secret);
    expect(decrypted).toEqual(payload);
  });
});
