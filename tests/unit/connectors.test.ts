import { describe, expect, it } from "vitest";
import { inferProviderKey, getConnectorByKey } from "@/lib/connectors/catalog";
import { resolveProviderKeyFromMetadata } from "@/lib/connectors/metadata";

describe("connector catalog", () => {
  it("infers provider from app type when metadata key is absent", () => {
    expect(inferProviderKey("internal_web_app")).toBe("internal_acme_support_admin");
    expect(inferProviderKey("api_schema")).toBe("api_schema");
  });

  it("resolves metadata provider key when valid", () => {
    const key = resolveProviderKeyFromMetadata("custom_web_app", { provider_key: "stripe" });
    expect(key).toBe("stripe");
  });

  it("falls back to inferred provider when metadata key is unknown", () => {
    const key = resolveProviderKeyFromMetadata("custom_web_app", { provider_key: "unknown" });
    expect(key).toBe("custom_web_app");
  });

  it("exposes known connector definitions", () => {
    const connector = getConnectorByKey("zendesk");
    expect(connector).toBeTruthy();
    expect(connector?.status).toBe("in_development");
  });
});
