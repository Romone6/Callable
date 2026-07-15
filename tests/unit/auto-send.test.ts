import { describe, expect, it } from "vitest";
import { simulateAutoSendDecision } from "@/lib/auto-send";

describe("auto-send simulator", () => {
  it("allows low-risk scenario when all guardrails pass", () => {
    const result = simulateAutoSendDecision({
      commandRiskLevel: "low",
      effectiveApprovalRules: { amount_greater_than: 500 },
      policyJson: {
        auto_send: {
          scenario_allowlist: ["refund_flow"],
          confidence_threshold: 0.9,
          zero_tolerance_violations: ["pii_leak"],
          bypass_prevention_enabled: true,
        },
      },
      scenario: "refund_flow",
      confidence: 0.93,
      violations: [],
      input: { amount: 100 },
      bypassRequest: false,
    });

    expect(result.status).toBe("allow_auto_send");
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks when risk, threshold, and zero-tolerance guardrails are breached", () => {
    const result = simulateAutoSendDecision({
      commandRiskLevel: "high",
      effectiveApprovalRules: { amount_greater_than: 200 },
      policyJson: {
        auto_send: {
          scenario_allowlist: ["refund_flow"],
          confidence_threshold: 0.95,
          zero_tolerance_violations: ["policy_violation"],
        },
      },
      scenario: "unknown_flow",
      confidence: 0.7,
      violations: ["policy_violation"],
      input: { amount: 450 },
      bypassRequest: true,
    });

    expect(result.status).toBe("require_human_approval");
    expect(result.blockers.map((item) => item.code)).toContain("high_risk_mandatory_human_approval");
    expect(result.blockers.map((item) => item.code)).toContain("scenario_not_allowlisted");
    expect(result.blockers.map((item) => item.code)).toContain("confidence_below_threshold");
    expect(result.blockers.map((item) => item.code)).toContain("zero_tolerance_violation");
    expect(result.blockers.map((item) => item.code)).toContain("amount_requires_approval_threshold");
    expect(result.blockers.map((item) => item.code)).toContain("bypass_prevention_enforced");
  });
});
