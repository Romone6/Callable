import { randomUUID } from "node:crypto";

export type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, event: string, payload: Record<string, unknown> = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  };
  // Structured JSON logs only.
  console.log(JSON.stringify(record));
}

export function requestId(): string {
  return randomUUID();
}

