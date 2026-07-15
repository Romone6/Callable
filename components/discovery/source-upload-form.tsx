"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { discoverySourceSchema, type DiscoverySourceInput } from "@/lib/validations/forms";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function SourceUploadForm({
  apps,
}: {
  apps: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const form = useForm<DiscoverySourceInput>({
    resolver: zodResolver(discoverySourceSchema),
    defaultValues: {
      name: "",
      type: "manual_process_text",
      app_id: "",
      raw_text: "",
    },
  });

  async function onSubmit(values: DiscoverySourceInput) {
    const response = await fetch("/api/discovery-sources/text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to save source"));
      return;
    }
    toast.success("Source uploaded");
    form.reset({ ...form.getValues(), name: "", raw_text: "" });
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Upload source evidence</h3>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input placeholder="refund_sop.txt" {...form.register("name")} />
        <Select {...form.register("app_id")}>
          <option value="">Not connected</option>
          {apps.map((app) => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </Select>
        <Select {...form.register("type")}>
          <option value="manual_process_text">manual_process_text</option>
          <option value="sop_document">sop_document</option>
          <option value="csv_ticket_export">csv_ticket_export</option>
          <option value="json_browser_trace">json_browser_trace</option>
          <option value="openapi_schema">openapi_schema</option>
          <option value="playwright_trace">playwright_trace</option>
        </Select>
        <Textarea rows={8} placeholder="Paste SOP/CSV/JSON evidence" {...form.register("raw_text")} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save source"}</Button>
      </form>
    </Card>
  );
}
