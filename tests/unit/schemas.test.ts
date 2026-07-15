import { describe, expect, it } from "vitest";
import { acknowledgeQueueJobSchema, createAppSchema, sourceTextSchema } from "@/lib/schemas";

describe("schema validation", () => {
  it("validates app payload", () => {
    const parsed = createAppSchema.safeParse({
      name: "Acme Support Admin",
      type: "internal_web_app",
      base_url: "http://localhost:3000",
      auth_method: "none",
      execution_mode: "hybrid",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid source payload", () => {
    const parsed = sourceTextSchema.safeParse({
      name: "missing fields",
      raw_text: "hello",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates queue acknowledgement payload", () => {
    const parsed = acknowledgeQueueJobSchema.safeParse({
      queue: "execution",
      job_id: "job_123",
      note: "triaged",
    });

    expect(parsed.success).toBe(true);
  });
});
