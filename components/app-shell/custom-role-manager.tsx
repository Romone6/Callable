"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/utils/api-error";

type RoleRecord = {
  role_key: string;
  role: string;
  name: string;
  description: string | null;
  permissions: string[];
  assigned_users: number;
};

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type RolesResponse = {
  builtin_roles: Array<{ role: string; permissions: string[] }>;
  custom_roles: RoleRecord[];
  users: UserRecord[];
};

const DEFAULT_PERMISSIONS = "executions:read,drift:read,approvals:read";

export function CustomRoleManager() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RolesResponse | null>(null);
  const [roleKey, setRoleKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [permissionsCsv, setPermissionsCsv] = useState(DEFAULT_PERMISSIONS);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("viewer");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/security/roles");
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to load roles"));
      setLoading(false);
      return;
    }
    setData(json as RolesResponse);
    setLoading(false);
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load roles");
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const availableRoles = useMemo(() => {
    if (!data) return [];
    return [
      ...data.builtin_roles.map((role) => ({ value: role.role, label: role.role })),
      ...data.custom_roles.map((role) => ({ value: role.role, label: `${role.name} (${role.role})` })),
    ];
  }, [data]);

  async function createRole() {
    setBusy(true);
    const permissions = permissionsCsv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const response = await fetch("/api/security/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role_key: roleKey,
        name: roleName,
        permissions,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to create custom role"));
      setBusy(false);
      return;
    }
    toast.success("Custom role created");
    setRoleKey("");
    setRoleName("");
    await load();
    setBusy(false);
  }

  async function assignRole() {
    setBusy(true);
    const response = await fetch("/api/security/roles/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUserId,
        role: selectedRole,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to assign role"));
      setBusy(false);
      return;
    }
    toast.success("User role updated");
    await load();
    setBusy(false);
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-text)]">Loading role controls...</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-text)]">Role controls unavailable.</p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold">Custom role editor</h3>
        <p className="text-sm text-[var(--muted-text)]">Create custom permission bundles and assign roles to workspace users.</p>
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 p-3">
        <p className="text-sm font-medium">Create custom role</p>
        <Input value={roleKey} onChange={(event) => setRoleKey(event.target.value)} placeholder="role_key (example: incident_reviewer)" />
        <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Display name" />
        <Input
          value={permissionsCsv}
          onChange={(event) => setPermissionsCsv(event.target.value)}
          placeholder="permissions (comma-separated)"
        />
        <Button type="button" onClick={createRole} disabled={busy || !roleKey || !roleName}>
          Create role
        </Button>
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 p-3">
        <p className="text-sm font-medium">Assign role to user</p>
        <Select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
          <option value="">Select user</option>
          {data.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email}) [{user.role}]
            </option>
          ))}
        </Select>
        <Select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
          {availableRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={assignRole} disabled={busy || !selectedUserId || !selectedRole}>
          Assign role
        </Button>
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 p-3">
        <p className="text-sm font-medium">Custom roles</p>
        {data.custom_roles.length === 0 ? (
          <p className="text-sm text-[var(--muted-text)]">No custom roles created yet.</p>
        ) : (
          data.custom_roles.map((role) => (
            <div key={role.role_key} className="rounded-lg border border-white/10 p-2">
              <p className="text-sm font-medium">{role.name} ({role.role})</p>
              <p className="text-xs text-[var(--muted-text)]">Assigned users: {role.assigned_users}</p>
              <p className="text-xs text-[var(--muted-text)]">Permissions: {role.permissions.join(", ")}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
