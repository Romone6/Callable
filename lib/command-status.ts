import { CommandStatus } from "@prisma/client";

const allowedTransitions: Record<CommandStatus, CommandStatus[]> = {
  draft: ["needs_review", "testing", "published", "archived"],
  needs_review: ["testing", "published", "archived"],
  testing: ["published", "paused", "broken", "archived"],
  published: ["paused", "broken", "archived"],
  paused: ["published", "archived"],
  broken: ["testing", "paused", "archived"],
  archived: [],
};

export function canTransitionStatus(from: CommandStatus, to: CommandStatus) {
  return allowedTransitions[from].includes(to);
}

