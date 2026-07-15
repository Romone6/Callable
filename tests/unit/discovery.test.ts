import { describe, expect, it } from "vitest";
import { normalizeConfidence, scoreRisk } from "@/lib/discovery-rules";

describe("discovery rules", () => {
  it("normalizes confidence", () => {
    expect(normalizeConfidence(1.5)).toBe(1);
    expect(normalizeConfidence(-1)).toBe(0);
    expect(normalizeConfidence(0.42)).toBe(0.42);
  });

  it("raises risk when refund/customer operations detected", () => {
    expect(scoreRisk({ description: "Issue refund to customer" })).toBe("medium");
    expect(scoreRisk({ description: "List dashboard" })).toBe("low");
  });
});
