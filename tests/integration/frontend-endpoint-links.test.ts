import { describe, expect, it } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getAgentCommands } from "@/app/api/agent/commands/route";

describe("frontend linked endpoint contracts", () => {
  it("serves health endpoint used by the UI", async () => {
    const response = await getHealth();
    expect([200, 503]).toContain(response.status);

    const body = await response.json();
    expect(body.service).toBe("callable");
    expect(typeof body.timestamp).toBe("string");
  });

  it("enforces auth on agent commands endpoint linked from docs", async () => {
    const response = await getAgentCommands(new Request("http://localhost/api/agent/commands"));
    expect([401, 403, 429]).toContain(response.status);

    const body = await response.json();
    if (response.status !== 429) {
      expect(["unauthorized", "forbidden"]).toContain(body.error?.code);
    }
  });
});
