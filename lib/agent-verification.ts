export type AgentVerificationState = "no_commands" | "awaiting_agent" | "commands_retrieved" | "commands_changed" | "verified";

export function getAgentVerificationStatus(input: { commandCount: number; listedAt: Date | null; dryRunAt: Date | null; latestCommandChangeAt?: Date | null }) {
  if (input.commandCount === 0) return { state: "no_commands" as const, verified: false };
  if (!input.listedAt) return { state: "awaiting_agent" as const, verified: false };
  if (input.latestCommandChangeAt && input.listedAt < input.latestCommandChangeAt) return { state: "commands_changed" as const, verified: false };
  if (!input.dryRunAt || input.dryRunAt < input.listedAt) return { state: "commands_retrieved" as const, verified: false };
  return { state: "verified" as const, verified: true };
}

export function shouldSendAgentVerificationEmail(status: { verified: boolean }, alreadySent: boolean) {
  return status.verified && !alreadySent;
}
