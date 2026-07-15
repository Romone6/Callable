import { describe, expect, it } from "vitest";
import { hasPermission, registerCustomRolePermissions, sanitizePermissions } from "@/lib/permissions";

describe("rbac permission matrix", () => {
  it("owner/admin can manage api keys", () => {
    expect(hasPermission("owner", "api_keys:manage")).toBe(true);
    expect(hasPermission("admin", "api_keys:manage")).toBe(true);
  });

  it("operator cannot manage api keys or publish commands", () => {
    expect(hasPermission("operator", "api_keys:manage")).toBe(false);
    expect(hasPermission("operator", "commands:publish")).toBe(false);
  });

  it("reviewer can review approvals but cannot execute commands", () => {
    expect(hasPermission("reviewer", "approvals:review")).toBe(true);
    expect(hasPermission("reviewer", "commands:execute")).toBe(false);
  });

  it("viewer has read-only scope", () => {
    expect(hasPermission("viewer", "audit:read")).toBe(true);
    expect(hasPermission("viewer", "apps:manage")).toBe(false);
    expect(hasPermission("viewer", "executions:manage")).toBe(false);
  });

  it("supports registered custom-role permissions", () => {
    registerCustomRolePermissions("custom:incident_reader", ["executions:read", "drift:read"]);
    expect(hasPermission("custom:incident_reader", "executions:read")).toBe(true);
    expect(hasPermission("custom:incident_reader", "commands:manage")).toBe(false);
  });

  it("sanitizes permission payload values", () => {
    const sanitized = sanitizePermissions(["executions:read", "invalid:value", "executions:read"]);
    expect(sanitized).toEqual(["executions:read"]);
  });
});
