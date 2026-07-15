import { RiskLevel } from "@prisma/client";

type CandidateLike = {
  description: string;
  approval_conditions?: string[];
};

export function scoreRisk(candidate: CandidateLike): RiskLevel {
  const text = `${candidate.description} ${(candidate.approval_conditions ?? []).join(" ")}`.toLowerCase();
  if (text.includes("delete") || text.includes("payment") || text.includes("refund") || text.includes("customer")) {
    return "medium";
  }
  return "low";
}

export function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

