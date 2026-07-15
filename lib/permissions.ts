export const ROLE_PERMISSIONS = {
  owner: [
    "apps:read",
    "apps:manage",
    "discovery:read",
    "discovery:manage",
    "commands:read",
    "commands:manage",
    "commands:publish",
    "commands:execute",
    "executions:read",
    "executions:manage",
    "approvals:read",
    "approvals:request",
    "approvals:review",
    "drift:read",
    "drift:run",
    "audit:read",
    "api_keys:read",
    "api_keys:manage",
    "connectors:read",
    "identity:read",
    "identity:manage",
    "scim:manage",
  ],
  admin: [
    "apps:read",
    "apps:manage",
    "discovery:read",
    "discovery:manage",
    "commands:read",
    "commands:manage",
    "commands:publish",
    "commands:execute",
    "executions:read",
    "executions:manage",
    "approvals:read",
    "approvals:request",
    "approvals:review",
    "drift:read",
    "drift:run",
    "audit:read",
    "api_keys:read",
    "api_keys:manage",
    "connectors:read",
    "identity:read",
    "identity:manage",
    "scim:manage",
  ],
  operator: [
    "apps:read",
    "apps:manage",
    "discovery:read",
    "discovery:manage",
    "commands:read",
    "commands:manage",
    "commands:execute",
    "executions:read",
    "executions:manage",
    "approvals:read",
    "approvals:request",
    "drift:read",
    "drift:run",
    "audit:read",
    "connectors:read",
    "identity:read",
  ],
  reviewer: [
    "apps:read",
    "discovery:read",
    "commands:read",
    "executions:read",
    "approvals:read",
    "approvals:review",
    "drift:read",
    "audit:read",
    "connectors:read",
    "identity:read",
  ],
  viewer: [
    "apps:read",
    "discovery:read",
    "commands:read",
    "executions:read",
    "approvals:read",
    "drift:read",
    "audit:read",
    "connectors:read",
    "identity:read",
  ],
} as const;

export type KnownRole = keyof typeof ROLE_PERMISSIONS;
export type Permission = (typeof ROLE_PERMISSIONS)[KnownRole][number];
type CustomPermissionList = readonly Permission[];

const CUSTOM_ROLE_PERMISSIONS = new Map<string, CustomPermissionList>();
const ALL_PERMISSIONS = new Set<Permission>(
  (Object.values(ROLE_PERMISSIONS) as readonly (readonly Permission[])[]).flat() as Permission[],
);

function normalizeRole(role: string): KnownRole {
  const normalized = role.toLowerCase();
  if (normalized === "owner" || normalized === "admin" || normalized === "operator" || normalized === "reviewer" || normalized === "viewer") {
    return normalized;
  }
  return "viewer";
}

export function hasPermission(role: string, permission: Permission): boolean {
  const customPermissions = CUSTOM_ROLE_PERMISSIONS.get(role);
  if (customPermissions) {
    return customPermissions.includes(permission);
  }
  const resolved = normalizeRole(role);
  return (ROLE_PERMISSIONS[resolved] as readonly string[]).includes(permission);
}

export function requirePermission(role: string, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: role '${role}' is missing permission '${permission}'`);
  }
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new Error(`Forbidden: role '${role}' cannot perform this action`);
  }
}

export function sanitizePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const normalized = input
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value): value is Permission => ALL_PERMISSIONS.has(value as Permission));
  return [...new Set(normalized)];
}

export function registerCustomRolePermissions(role: string, permissions: Permission[]) {
  if (!role.startsWith("custom:")) return;
  CUSTOM_ROLE_PERMISSIONS.set(role, [...new Set(permissions)] as Permission[]);
}
