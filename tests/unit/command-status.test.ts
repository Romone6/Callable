import { describe, expect, it } from "vitest";
import { canTransitionStatus } from "@/lib/command-status";

describe("command status transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionStatus("draft", "published")).toBe(true);
    expect(canTransitionStatus("published", "paused")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionStatus("archived", "published")).toBe(false);
    expect(canTransitionStatus("published", "draft")).toBe(false);
  });
});
