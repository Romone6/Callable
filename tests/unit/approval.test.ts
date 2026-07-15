import { describe, expect, it } from "vitest";
import { requiresApproval } from "@/lib/approval-rules";

describe("approval rules", () => {
  it("requires approval when amount exceeds threshold", () => {
    expect(requiresApproval(450, 200)).toBe(true);
  });

  it("does not require approval at or below threshold", () => {
    expect(requiresApproval(200, 200)).toBe(false);
    expect(requiresApproval(25, 200)).toBe(false);
  });
});
