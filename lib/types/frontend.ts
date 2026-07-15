export type HealthStatus = "unknown" | "healthy" | "warning" | "broken";

export type UiStatusTone = "default" | "success" | "warning" | "danger" | "info";

export type CommandRunRequest = {
  command_name: string;
  input: Record<string, unknown>;
  agent_name: string;
  dry_run?: boolean;
};

export type CommandRunSuccess = {
  status: "succeeded";
  execution_id: string;
  output: Record<string, unknown>;
  execution_mode: string;
};

export type CommandRunApproval = {
  status: "waiting_for_approval";
  approval_required: true;
  reason: string;
  execution_id: string;
};

export type CommandRunFailure = {
  status: "failed";
  execution_id: string;
  error: string;
};

export type CommandRunResponse = CommandRunSuccess | CommandRunApproval | CommandRunFailure;

