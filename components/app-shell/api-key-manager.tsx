"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiKeyFormSchema, type ApiKeyFormInput } from "@/lib/validations/forms";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const defaultScopes = ["commands:read", "commands:run", "executions:read", "audit:read"];

export function ApiKeyManager() {
  const router = useRouter();
  const [lastKey, setLastKey] = useState<string | null>(null);
  const form = useForm<ApiKeyFormInput>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: "local-agent",
      scopes: defaultScopes,
    },
  });

  async function onSubmit(values: ApiKeyFormInput) {
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Failed to create API key"));
      return;
    }
    setLastKey(json.api_key ?? null);
    toast.success("API key created. Copy it now; it will not be shown again.");
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Generate API key</h3>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input {...form.register("name")} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Create key"}</Button>
      </form>
      <p className="mt-3 text-xs text-[var(--muted-text)]">Keys are hashed server-side. Plain text is never stored.</p>
      {lastKey ? <pre className="mt-3 overflow-x-auto rounded-lg border border-lime-300/30 bg-black/30 p-3 text-xs text-lime-100">{lastKey}</pre> : null}
    </Card>
  );
}
