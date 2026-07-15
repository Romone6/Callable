"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { settingsSchema, type SettingsInput } from "@/lib/validations/forms";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SettingsForm() {
  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      workspace_name: "Default Workspace",
      default_approval_threshold: 200,
    },
  });

  return (
    <Card>
      <h3 className="text-lg font-semibold">Workspace settings</h3>
      <p className="mt-2 text-sm text-[var(--muted-text)]">Persisted settings are Unavailable in this version. Values below are local form validation only.</p>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(() => undefined)}>
        <Input {...form.register("workspace_name")} />
        <Input type="number" {...form.register("default_approval_threshold", { valueAsNumber: true })} />
        <Button type="submit" variant="secondary">Unavailable</Button>
      </form>
    </Card>
  );
}

