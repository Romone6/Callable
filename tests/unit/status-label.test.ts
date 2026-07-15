import { describe, expect, it } from "vitest";
import { formatStatusLabel } from "@/lib/utils/status-label";

describe("formatStatusLabel", () => {
  it("maps coming_soon to unavailable", () => {
    expect(formatStatusLabel("coming_soon")).toBe("unavailable");
  });

  it("formats underscore statuses", () => {
    expect(formatStatusLabel("waiting_for_approval")).toBe("waiting for approval");
  });

  it("normalizes case", () => {
    expect(formatStatusLabel("FAILED")).toBe("failed");
  });
});
