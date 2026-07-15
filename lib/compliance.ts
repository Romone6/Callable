import { createHmac } from "node:crypto";

export type ComplianceResource = "audit_logs" | "approvals" | "executions";
export type ComplianceExportFormat = "json" | "csv";

export function signExportPayload(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function normalizeDateRange(fromParam: string | null, toParam: string | null) {
  const from = fromParam ? new Date(fromParam) : null;
  const to = toParam ? new Date(toParam) : null;

  if (from && Number.isNaN(from.getTime())) {
    throw new Error("Invalid from date");
  }
  if (to && Number.isNaN(to.getTime())) {
    throw new Error("Invalid to date");
  }
  if (from && to && from > to) {
    throw new Error("from date must be before to date");
  }
  return { from, to };
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "";
  }
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const headerLine = headers.join(",");
  const dataLines = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","));
  return [headerLine, ...dataLines].join("\n");
}
