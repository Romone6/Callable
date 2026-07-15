import { describe, expect, it } from "vitest";
import { buildOpenApiSpec } from "@/lib/openapi";

describe("openapi spec builder", () => {
  it("builds v1 contract with local server context", () => {
    const spec = buildOpenApiSpec(new Request("http://localhost:3100/api/v1/openapi"));
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.version).toBe("v1");
    expect(spec.servers[0]?.url).toBe("http://localhost:3100");
    expect(spec.paths["/api/v1/openapi"]).toBeUndefined();
    expect(spec.paths["/api/mcp/audit"]).toBeDefined();
  });
});
