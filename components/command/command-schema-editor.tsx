"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { commandSchemaEditorSchema, type CommandSchemaEditorInput } from "@/lib/validations/forms";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CommandSchemaEditor({
  commandId,
  inputSchema,
  outputSchema,
  approvalRules,
}: {
  commandId: string;
  inputSchema: unknown;
  outputSchema: unknown;
  approvalRules: unknown;
}) {
  const router = useRouter();
  const form = useForm<CommandSchemaEditorInput>({
    resolver: zodResolver(commandSchemaEditorSchema),
    defaultValues: {
      input_schema_json: JSON.stringify(inputSchema, null, 2),
      output_schema_json: JSON.stringify(outputSchema, null, 2),
      approval_rules_json: JSON.stringify(approvalRules ?? { amount_greater_than: 200 }, null, 2),
    },
  });

  async function onSubmit(values: CommandSchemaEditorInput) {
    const response = await fetch(`/api/commands/${commandId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input_schema_json: JSON.parse(values.input_schema_json),
        output_schema_json: JSON.parse(values.output_schema_json),
        approval_rules_json: JSON.parse(values.approval_rules_json),
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Update failed"));
      return;
    }
    toast.success("Schema updated");
    router.refresh();
  }

  async function publish() {
    const response = await fetch(`/api/commands/${commandId}/publish`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Publish failed"));
      return;
    }
    toast.success("Command published");
    router.refresh();
  }

  async function pause() {
    const response = await fetch(`/api/commands/${commandId}/pause`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Pause failed"));
      return;
    }
    toast.success("Command paused");
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Schema editor</h3>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Textarea rows={8} {...form.register("input_schema_json")} />
        <Textarea rows={8} {...form.register("output_schema_json")} />
        <Textarea rows={6} {...form.register("approval_rules_json")} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save schema</Button>
          <Button type="button" variant="secondary" onClick={publish}>Publish</Button>
          <Button type="button" variant="secondary" onClick={pause}>Pause</Button>
        </div>
      </form>
    </Card>
  );
}
