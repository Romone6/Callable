import { describe, expect, it } from "vitest";
import { rowsToCsv, signExportPayload } from "@/lib/compliance";

describe("compliance helpers", () => {
  it("creates csv output from row objects", () => {
    const csv = rowsToCsv([
      { id: "1", status: "ok" },
      { id: "2", status: "failed" },
    ]);

    expect(csv.includes("id,status")).toBe(true);
    expect(csv.includes("1,ok")).toBe(true);
  });

  it("returns deterministic signature for payload", () => {
    const payload = JSON.stringify({ a: 1 });
    const a = signExportPayload(payload, "unit-test-key");
    const b = signExportPayload(payload, "unit-test-key");
    expect(a).toBe(b);
  });
});
