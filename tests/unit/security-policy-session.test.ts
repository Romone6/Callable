import { describe, expect, it } from "vitest";
import { assertSessionSecurityPolicy } from "@/lib/security-policy";

describe("assertSessionSecurityPolicy", () => {
  it("rejects when MFA is required but second factor is not present", () => {
    expect(() =>
      assertSessionSecurityPolicy({
        session_timeout_minutes: 120,
        require_mfa: true,
        session_claims: {
          iat: Math.floor(Date.now() / 1000),
          fva: [1, -1],
        },
      }),
    ).toThrow(/requires MFA/i);
  });

  it("allows when MFA is satisfied and session is within timeout", () => {
    expect(() =>
      assertSessionSecurityPolicy({
        session_timeout_minutes: 120,
        require_mfa: true,
        session_claims: {
          iat: Math.floor(Date.now() / 1000) - 60,
          fva: [0, 5],
        },
      }),
    ).not.toThrow();
  });

  it("rejects when session age exceeds timeout", () => {
    expect(() =>
      assertSessionSecurityPolicy({
        session_timeout_minutes: 1,
        require_mfa: false,
        now_ms: 180_000,
        session_claims: {
          iat: 60,
        },
      }),
    ).toThrow(/timeout policy/i);
  });
});
