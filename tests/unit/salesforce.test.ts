import { describe, expect, it } from "vitest";
import { buildSalesforceConnectionRequest, readSalesforceCredentials } from "@/lib/connectors/salesforce";

describe("Salesforce connector inputs", () => {
  it("reads a server-only access-token variable and probes the configured REST API version", () => {
    const credentials = readSalesforceCredentials({ auth_env_key: "SALESFORCE_ACCESS_TOKEN", api_version: "v60.0" }, { SALESFORCE_ACCESS_TOKEN: "token" });
    expect(credentials).toEqual({ token: "token", apiVersion: "v60.0" });
    expect(buildSalesforceConnectionRequest("https://example.my.salesforce.com", credentials)).toEqual({
      endpoint: "https://example.my.salesforce.com/services/data/v60.0/limits",
      headers: { authorization: "Bearer token" },
    });
  });

  it("rejects public or missing access-token configuration", () => {
    expect(() => readSalesforceCredentials({ auth_env_key: "NEXT_PUBLIC_TOKEN" }, {})).toThrow("server-only");
    expect(() => readSalesforceCredentials({ auth_env_key: "SALESFORCE_ACCESS_TOKEN", api_version: "v60.0" }, {})).toThrow("unavailable");
  });
});
