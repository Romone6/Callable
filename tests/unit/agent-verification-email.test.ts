import { describe, expect, it } from "vitest";
import { buildAgentVerificationEmail, getVerificationEmailConfig } from "@/lib/agent-verification-email";

describe("agent verification email", () => {
  it("stays unavailable until real email credentials and a sender are configured", () => {
    expect(getVerificationEmailConfig({})).toBeNull();
    expect(getVerificationEmailConfig({ RESEND_API_KEY: "re_test", CALLABLE_EMAIL_FROM: "Callable <verified@example.com>" })).toEqual({
      apiKey: "re_test",
      from: "Callable <verified@example.com>",
    });
  });

  it("builds a command inventory document without exposing an API key", () => {
    const email = buildAgentVerificationEmail({
      recipient: "owner@example.com",
      agentName: "support-agent",
      commands: [{ name: "update_ticket", description: "Updates a support ticket", riskLevel: "medium" }],
      completedAt: new Date("2026-07-22T10:00:00Z"),
    });

    expect(email.to).toBe("owner@example.com");
    expect(email.text).toContain("update_ticket");
    expect(email.text).not.toContain("vk_");
  });
});
