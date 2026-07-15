import { parse } from "csv-parse/sync";

export type ParseResult = {
  status: "parsed" | "parse_failed";
  parsedJson?: unknown;
  errorMessage?: string;
};

export function parseSource(type: string, text: string): ParseResult {
  try {
    if (type === "csv_ticket_export") {
      const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
      return { status: "parsed", parsedJson: rows };
    }

    if (type === "json_browser_trace" || type === "openapi_schema" || type === "playwright_trace") {
      return { status: "parsed", parsedJson: JSON.parse(text) };
    }

    return {
      status: "parsed",
      parsedJson: {
        text,
        length: text.length,
      },
    };
  } catch (error) {
    return {
      status: "parse_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
}

