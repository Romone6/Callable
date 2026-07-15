import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type JsonObject = Record<string, unknown>;

type ApprovalStageRule = {
  name: string;
  required_role?: string;
  amount_greater_than?: number;
};

type EffectiveApprovalRules = {
  amount_greater_than?: number;
  stages?: ApprovalStageRule[];
};

function asJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

function parseStageRules(value: unknown): ApprovalStageRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, idx) => {
      const raw = item as JsonObject;
      const stage: ApprovalStageRule = {
        name: typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name.trim() : `stage_${idx + 1}`,
      };
      if (typeof raw.required_role === "string" && raw.required_role.trim().length > 0) {
        stage.required_role = raw.required_role.trim();
      }
      if (typeof raw.amount_greater_than === "number" && Number.isFinite(raw.amount_greater_than) && raw.amount_greater_than >= 0) {
        stage.amount_greater_than = raw.amount_greater_than;
      }
      return stage;
    });
}

function deriveGlobalThreshold(stages: ApprovalStageRule[], fallback: number | undefined) {
  if (stages.length === 0) return fallback;
  const thresholds = stages.map((stage) => stage.amount_greater_than).filter((value): value is number => typeof value === "number");
  if (thresholds.length !== stages.length) {
    return 0;
  }
  return Math.min(...thresholds);
}

function normalizeRulesFromObject(raw: JsonObject): EffectiveApprovalRules | null {
  const stages = parseStageRules(raw.stages);

  let threshold: number | undefined;
  if (typeof raw.amount_greater_than === "number" && Number.isFinite(raw.amount_greater_than) && raw.amount_greater_than >= 0) {
    threshold = raw.amount_greater_than;
  }

  if (stages.length > 0) {
    threshold = deriveGlobalThreshold(stages, threshold);
  }

  if (threshold === undefined && stages.length === 0) {
    return null;
  }

  return {
    amount_greater_than: threshold,
    stages: stages.length > 0 ? stages : undefined,
  };
}

function normalizeRulesFromPolicyJson(raw: JsonObject): EffectiveApprovalRules | null {
  const stages = parseStageRules(raw.stages);

  let threshold: number | undefined;
  const thresholds = asJsonObject(raw.thresholds);
  if (
    thresholds &&
    typeof thresholds.amount_greater_than === "number" &&
    Number.isFinite(thresholds.amount_greater_than) &&
    thresholds.amount_greater_than >= 0
  ) {
    threshold = thresholds.amount_greater_than;
  }

  if (stages.length > 0) {
    threshold = deriveGlobalThreshold(stages, threshold);
  }

  if (threshold === undefined && stages.length === 0) {
    return null;
  }

  return {
    amount_greater_than: threshold,
    stages: stages.length > 0 ? stages : undefined,
  };
}

export async function resolveEffectiveApprovalRules(
  organisationId: string,
  commandApprovalRulesJson: Prisma.JsonValue | null | undefined,
): Promise<Prisma.JsonValue | null> {
  const commandRules = asJsonObject(commandApprovalRulesJson);
  if (commandRules) {
    const normalizedCommand = normalizeRulesFromObject(commandRules);
    if (normalizedCommand) {
      return normalizedCommand as Prisma.JsonValue;
    }
  }

  const policy = await prisma.approvalPolicy.findFirst({
    where: {
      organisationId,
      status: "active",
      isDefault: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  if (!policy) {
    return null;
  }

  const policyRules = asJsonObject(policy.policyJson);
  if (!policyRules) {
    return null;
  }

  const normalized = normalizeRulesFromPolicyJson(policyRules);
  return normalized ? (normalized as Prisma.JsonValue) : null;
}
