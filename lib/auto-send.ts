import type { Prisma } from "@prisma/client";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toLowerSet(items: string[]) {
  return new Set(items.map((item) => item.toLowerCase()));
}

function parseAmount(input: Record<string, unknown> | undefined) {
  if (!input) return null;
  const amount = input.amount;
  if (typeof amount !== "number" || Number.isNaN(amount)) return null;
  return amount;
}

function thresholdFromRules(value: Prisma.JsonValue | null | undefined) {
  const record = asRecord(value);
  if (!record) return null;
  const threshold = record.amount_greater_than;
  if (typeof threshold === "number" && Number.isFinite(threshold) && threshold >= 0) {
    return threshold;
  }
  return null;
}

function parseGuardrails(policyJson: Prisma.JsonValue | null | undefined) {
  const root = asRecord(policyJson);
  if (!root) {
    return {
      scenarioAllowlist: [] as string[],
      confidenceThreshold: 1,
      zeroToleranceViolations: [] as string[],
      bypassPreventionEnabled: true,
    };
  }

  const autoSend = asRecord(root.auto_send);
  const scenarioAllowlist =
    asStringList(autoSend?.scenario_allowlist ?? root.scenario_gates);
  const zeroToleranceViolations =
    asStringList(autoSend?.zero_tolerance_violations ?? root.zero_tolerance_violations);
  const confidenceThresholdRaw = autoSend?.confidence_threshold;
  const confidenceThreshold =
    typeof confidenceThresholdRaw === "number" && confidenceThresholdRaw >= 0 && confidenceThresholdRaw <= 1
      ? confidenceThresholdRaw
      : 1;
  const bypassPreventionRaw = autoSend?.bypass_prevention_enabled;
  const bypassPreventionEnabled = bypassPreventionRaw === false ? false : true;

  return {
    scenarioAllowlist,
    confidenceThreshold,
    zeroToleranceViolations,
    bypassPreventionEnabled,
  };
}

export type AutoSendDecisionInput = {
  commandRiskLevel: "low" | "medium" | "high";
  effectiveApprovalRules: Prisma.JsonValue | null | undefined;
  policyJson: Prisma.JsonValue | null | undefined;
  scenario: string;
  confidence: number;
  violations: string[];
  input?: Record<string, unknown>;
  bypassRequest: boolean;
};

export function simulateAutoSendDecision(input: AutoSendDecisionInput) {
  const blockers: Array<{ code: string; message: string; severity: "critical" | "high" | "medium" }> = [];
  const scenario = input.scenario.trim().toLowerCase();
  const violationsLower = toLowerSet(input.violations);

  const guardrails = parseGuardrails(input.policyJson);
  const scenarioAllowlistLower = toLowerSet(guardrails.scenarioAllowlist);
  const zeroToleranceLower = toLowerSet(guardrails.zeroToleranceViolations);

  if (input.commandRiskLevel === "high") {
    blockers.push({
      code: "high_risk_mandatory_human_approval",
      message: "High-risk command category requires human approval.",
      severity: "critical",
    });
  }

  if (guardrails.bypassPreventionEnabled && input.bypassRequest) {
    blockers.push({
      code: "bypass_prevention_enforced",
      message: "Bypass request is blocked by policy guardrails.",
      severity: "critical",
    });
  }

  if (scenarioAllowlistLower.size > 0 && !scenarioAllowlistLower.has(scenario)) {
    blockers.push({
      code: "scenario_not_allowlisted",
      message: `Scenario '${input.scenario}' is not allowlisted for auto-send.`,
      severity: "high",
    });
  }

  if (input.confidence < guardrails.confidenceThreshold) {
    blockers.push({
      code: "confidence_below_threshold",
      message: `Confidence ${input.confidence.toFixed(3)} is below policy threshold ${guardrails.confidenceThreshold.toFixed(3)}.`,
      severity: "high",
    });
  }

  const breachedZeroTolerance = [...zeroToleranceLower].filter((item) => violationsLower.has(item));
  if (breachedZeroTolerance.length > 0) {
    blockers.push({
      code: "zero_tolerance_violation",
      message: `Zero-tolerance violations detected: ${breachedZeroTolerance.join(", ")}.`,
      severity: "critical",
    });
  }

  const threshold = thresholdFromRules(input.effectiveApprovalRules);
  const amount = parseAmount(input.input);
  if (threshold !== null && amount !== null && amount > threshold) {
    blockers.push({
      code: "amount_requires_approval_threshold",
      message: `Input amount ${amount} exceeds approval threshold ${threshold}.`,
      severity: "high",
    });
  }

  const status = blockers.length === 0 ? "allow_auto_send" : "require_human_approval";

  return {
    status,
    blockers,
    guardrails: {
      confidence_threshold: guardrails.confidenceThreshold,
      scenario_allowlist: guardrails.scenarioAllowlist,
      zero_tolerance_violations: guardrails.zeroToleranceViolations,
      bypass_prevention_enabled: guardrails.bypassPreventionEnabled,
      applied_amount_threshold: threshold,
    },
  };
}
