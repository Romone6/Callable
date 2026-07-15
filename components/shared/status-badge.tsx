import { Badge } from "@/components/ui/badge";
import type { HealthStatus } from "@/lib/types/frontend";
import { formatStatusLabel } from "@/lib/utils/status-label";

const tones: Record<string, "default" | "success" | "warning" | "danger" | "neutral"> = {
  connected: "success",
  healthy: "success",
  published: "success",
  succeeded: "success",
  pending: "warning",
  warning: "warning",
  waiting_for_approval: "warning",
  failed: "danger",
  broken: "danger",
  paused: "neutral",
  archived: "neutral",
  not_connected: "neutral",
  in_development: "warning",
  coming_soon: "neutral",
  custom_connector: "default",
  available: "success",
  testing: "default",
  unknown: "neutral",
};

export function StatusBadge({ value }: { value: string | HealthStatus }) {
  const key = String(value).toLowerCase();
  return <Badge variant={tones[key] ?? "default"}>{formatStatusLabel(key)}</Badge>;
}
