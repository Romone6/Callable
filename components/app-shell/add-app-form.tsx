"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { appFormSchema, type AppFormInput } from "@/lib/validations/forms";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const defaultProviderByType: Record<"internal_web_app" | "custom_web_app" | "api_schema" | "uploaded_workflow_evidence", AppFormInput["provider_key"]> = {
  internal_web_app: "internal_acme_support_admin",
  custom_web_app: "custom_web_app",
  api_schema: "api_schema",
  uploaded_workflow_evidence: "uploaded_workflow_evidence",
};

const defaultOperationByProvider: Partial<Record<NonNullable<AppFormInput["provider_key"]>, NonNullable<AppFormInput["provider_operation"]>>> = {
  stripe: "create_refund",
  zendesk: "update_ticket",
  hubspot: "update_contact",
};

export function AddAppForm() {
  const router = useRouter();
  const form = useForm<AppFormInput>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      name: "",
      base_url: "http://localhost:3100",
      type: "internal_web_app",
      provider_key: "internal_acme_support_admin",
      auth_method: "none",
      execution_mode: "hybrid",
      auth_env_key: "",
      username_env_key: "",
      provider_operation: "create_refund",
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const selectedProvider = useWatch({ control: form.control, name: "provider_key" });
  const selectedOperation = useWatch({ control: form.control, name: "provider_operation" });

  useEffect(() => {
    if (!selectedType || !selectedProvider) return;
    const fallback = defaultProviderByType[selectedType];
    if (
      fallback !== selectedProvider &&
      (selectedProvider === "internal_acme_support_admin" ||
        selectedProvider === "custom_web_app" ||
        selectedProvider === "api_schema" ||
        selectedProvider === "uploaded_workflow_evidence")
    ) {
      form.setValue("provider_key", fallback, { shouldDirty: true });
    }
  }, [form, selectedProvider, selectedType]);

  useEffect(() => {
    if (!selectedProvider) return;
    const fallback = defaultOperationByProvider[selectedProvider];
    if (!fallback) {
      if (selectedOperation) form.setValue("provider_operation", undefined, { shouldDirty: true });
      return;
    }
    if (selectedOperation !== fallback) {
      form.setValue("provider_operation", fallback, { shouldDirty: true });
    }
  }, [form, selectedOperation, selectedProvider]);

  const needsAuthEnv = selectedProvider === "stripe" || selectedProvider === "hubspot" || selectedProvider === "zendesk";
  const needsUsernameEnv = selectedProvider === "zendesk";
  const supportsOperation = selectedProvider === "stripe" || selectedProvider === "hubspot" || selectedProvider === "zendesk";

  async function onSubmit(values: AppFormInput) {
    const payload = {
      ...values,
      auth_env_key: values.auth_env_key?.trim() ? values.auth_env_key.trim() : undefined,
      username_env_key: values.username_env_key?.trim() ? values.username_env_key.trim() : undefined,
      provider_operation: values.provider_operation ? values.provider_operation : undefined,
    };

    const response = await fetch("/api/apps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Failed to add app"));
      return;
    }
    toast.success("App created");
    form.reset({ ...form.getValues(), name: "", auth_env_key: "", username_env_key: "" });
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Add app</h3>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input placeholder="Acme Support Admin" {...form.register("name")} />
        <Select {...form.register("type")}>
          <option value="internal_web_app">internal_web_app</option>
          <option value="custom_web_app">custom_web_app</option>
          <option value="api_schema">api_schema</option>
          <option value="uploaded_workflow_evidence">uploaded_workflow_evidence</option>
        </Select>

        <Select {...form.register("provider_key")}>
          <option value="internal_acme_support_admin">internal_acme_support_admin</option>
          <option value="custom_web_app">custom_web_app</option>
          <option value="api_schema">api_schema</option>
          <option value="uploaded_workflow_evidence">uploaded_workflow_evidence</option>
          <option value="stripe">stripe</option>
          <option value="zendesk">zendesk</option>
          <option value="hubspot">hubspot</option>
          <option value="salesforce">salesforce</option>
          <option value="netsuite">netsuite</option>
          <option value="jira">jira</option>
        </Select>

        <Input placeholder="http://localhost:3100" {...form.register("base_url")} />

        {supportsOperation ? (
          <Select {...form.register("provider_operation")}>
            {selectedProvider === "stripe" ? (
              <>
                <option value="create_refund">create_refund</option>
                <option value="retrieve_refund">retrieve_refund</option>
              </>
            ) : null}
            {selectedProvider === "zendesk" ? <option value="update_ticket">update_ticket</option> : null}
            {selectedProvider === "hubspot" ? <option value="update_contact">update_contact</option> : null}
          </Select>
        ) : null}

        {needsAuthEnv ? (
          <Input
            placeholder={selectedProvider === "stripe" ? "STRIPE_API_KEY" : selectedProvider === "hubspot" ? "HUBSPOT_PRIVATE_APP_TOKEN" : "ZENDESK_API_TOKEN"}
            {...form.register("auth_env_key")}
          />
        ) : null}

        {needsUsernameEnv ? (
          <Input placeholder="ZENDESK_EMAIL" {...form.register("username_env_key")} />
        ) : null}

        {form.formState.errors.name ? <p className="text-xs text-red-300">{form.formState.errors.name.message}</p> : null}
        {form.formState.errors.base_url ? <p className="text-xs text-red-300">{form.formState.errors.base_url.message}</p> : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Create app"}</Button>
      </form>
    </Card>
  );
}

export function TestConnectionButton({ appId }: { appId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    try {
      setPending(true);
      const response = await fetch(`/api/apps/${appId}/test-connection`, { method: "POST" });
      const json = await response.json();
      if (!response.ok) {
        toast.error(getApiErrorMessage(json, "Connection test failed"));
      } else if (json.connection_status === "connected") {
        toast.success(`Connection ${json.connection_status}`);
      } else {
        toast.error(json.error ? `Connection ${json.connection_status}: ${json.error}` : `Connection ${json.connection_status}`);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={onClick} disabled={pending}>
      {pending ? "Testing..." : "Test connection"}
    </Button>
  );
}
