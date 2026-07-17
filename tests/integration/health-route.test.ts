import { describe, expect, it } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";

describe("health route", () => {
  it("returns readiness checks with truthful dependency states", async () => {
    const response = await getHealth();
    expect([200, 503]).toContain(response.status);

    const body = await response.json();
    expect(body.service).toBe("callable");
    expect(["ok", "degraded"]).toContain(body.status);
    expect(typeof body.timestamp).toBe("string");

    expect(body.checks).toBeDefined();
    expect(["ok", "error"]).toContain(body.checks.database.status);
    expect(["ok", "unavailable"]).toContain(body.checks.discovery.status);
    expect(["ok", "unavailable"]).toContain(body.checks.localAuth.status);
  });
});
