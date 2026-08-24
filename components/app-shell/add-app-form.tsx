"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { appFormSchema, type AppFormInput } from "@/lib/validations/forms";

export function AddAppForm() {
  const router = useRouter();
  const [providerKey, setProviderKey] = useState<AppFormInput["provider_key"]>("internal_acme_support_admin");
  const form = useForm<AppFormInput>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      name: "",
      base_url: "http://localhost:3100",
      type: "internal_web_app",
      provider_key: "internal_acme_support_admin",
      auth_method: "none",
      execution_mode: "api",
      metadata_json: {},
    },
  });
  const isZendesk = providerKey === "zendesk";
  const isSalesforce = providerKey === "salesforce";

  async function onSubmit(values: AppFormInput) {
    const payload = isZendesk || isSalesforce
      ? { ...values, type: "custom_web_app" as const, auth_method: isZendesk ? "basic" : "bearer" }
      : values;
    const response = await fetch("/api/apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Unable to create app");
      return;
    }
    toast.success("App created");
    form.reset();
    setProviderKey("internal_acme_support_admin");
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Register a real target</h3>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input placeholder={isZendesk ? "Customer support" : isSalesforce ? "Salesforce" : "Acme Support Admin"} aria-label="Application name" {...form.register("name")} />
        <Select aria-label="Target provider" {...form.register("provider_key", { onChange: (event) => setProviderKey(event.target.value as AppFormInput["provider_key"]) })}>
          <option value="internal_acme_support_admin">Acme Support Admin (controlled target)</option>
          <option value="zendesk">Zendesk ticket updates</option>
          <option value="salesforce">Salesforce connection</option>
          <option value="custom_web_app">Custom Web App (evidence only)</option>
          <option value="api_schema">API Schema Target (evidence only)</option>
          <option value="uploaded_workflow_evidence">Workflow Evidence</option>
        </Select>
        {!isZendesk && !isSalesforce && <Select aria-label="Application type" {...form.register("type")}><option value="internal_web_app">internal_web_app</option><option value="custom_web_app">custom_web_app</option><option value="api_schema">api_schema</option><option value="uploaded_workflow_evidence">uploaded_workflow_evidence</option></Select>}
        <Input placeholder={isZendesk ? "https://your-subdomain.zendesk.com" : isSalesforce ? "https://your-instance.my.salesforce.com" : "http://localhost:3100"} aria-label="Base URL" {...form.register("base_url")} />
        {isZendesk && <>
          <Input placeholder="ZENDESK_API_TOKEN" aria-label="Zendesk token environment variable" {...form.register("metadata_json.auth_env_key")} />
          <Input placeholder="ZENDESK_AGENT_EMAIL" aria-label="Zendesk email environment variable" {...form.register("metadata_json.username_env_key")} />
          <p className="text-xs text-muted-foreground">Only environment variable names are saved. Credentials remain on the server.</p>
        </>}
        {isSalesforce && <>
          <Input placeholder="SALESFORCE_ACCESS_TOKEN" aria-label="Salesforce access token environment variable" {...form.register("metadata_json.auth_env_key")} />
          <Input placeholder="v60.0" aria-label="Salesforce API version" {...form.register("metadata_json.api_version")} />
          <p className="text-xs text-muted-foreground">Only the access-token variable name and REST API version are saved. Connection testing calls Salesforce&apos;s real limits endpoint; execution is not enabled yet.</p>
        </>}
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Create app"}</Button>
      </form>
    </Card>
  );
}

export function TestConnectionButton({ appId }: { appId: string }) {
  const router = useRouter();
  async function onClick() {
    const response = await fetch(`/api/apps/${appId}/test-connection`, { method: "POST" });
    const body = await response.json().catch(() => null) as { data?: { error?: string } } | null;
    toast[response.ok ? "success" : "error"](response.ok ? "Connection tested" : body?.data?.error ?? "Connection failed");
    router.refresh();
  }
  return <Button type="button" variant="secondary" size="sm" onClick={onClick}>Test connection</Button>;
}
