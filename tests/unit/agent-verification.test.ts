import { describe, expect, it } from "vitest";
import { getAgentVerificationStatus, shouldSendAgentVerificationEmail } from "@/lib/agent-verification";

describe("agent verification", () => {
  it("requires a command inventory request and a succeeding dry run", () => {
    expect(getAgentVerificationStatus({ commandCount: 2, listedAt: null, dryRunAt: null }).state).toBe("awaiting_agent");
    expect(getAgentVerificationStatus({ commandCount: 2, listedAt: new Date("2026-07-22T10:00:00Z"), dryRunAt: null }).state).toBe("commands_retrieved");
    expect(getAgentVerificationStatus({ commandCount: 2, listedAt: new Date("2026-07-22T10:00:00Z"), dryRunAt: new Date("2026-07-22T10:01:00Z") }).state).toBe("verified");
  });

  it("does not verify an agent when no published commands exist", () => {
    expect(getAgentVerificationStatus({ commandCount: 0, listedAt: new Date(), dryRunAt: new Date() })).toMatchObject({
      state: "no_commands",
      verified: false,
    });
  });

  it("requires the agent to refresh its inventory after a command changes", () => {
    expect(getAgentVerificationStatus({
      commandCount: 1,
      listedAt: new Date("2026-07-22T10:00:00Z"),
      dryRunAt: new Date("2026-07-22T10:02:00Z"),
      latestCommandChangeAt: new Date("2026-07-22T10:01:00Z"),
    })).toMatchObject({ state: "commands_changed", verified: false });
  });

  it("sends the completion record only once after verification", () => {
    expect(shouldSendAgentVerificationEmail({ verified: true }, false)).toBe(true);
    expect(shouldSendAgentVerificationEmail({ verified: true }, true)).toBe(false);
    expect(shouldSendAgentVerificationEmail({ verified: false }, false)).toBe(false);
  });
});
