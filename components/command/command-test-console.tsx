"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { runCommandSchema, type RunCommandInput } from "@/lib/validations/forms";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CommandTestConsole({ commandId, commandName }: { commandId: string; commandName: string }) {
  const router = useRouter();
  const form = useForm<RunCommandInput>({
    resolver: zodResolver(runCommandSchema),
    defaultValues: { ticket_id: "TCK-1001", amount: 25, reason: "duplicate billing", agent_name: "dashboard-user" },
  });

  async function submit(dryRun: boolean) {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    const response = await fetch(`/api/commands/${commandId}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agent_name: values.agent_name,
        input: { ticket_id: values.ticket_id, amount: values.amount, reason: values.reason },
        dry_run: dryRun,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Execution failed"));
      return;
    }

    if (json.status === "failed") {
      toast.error(`${commandName} failed: ${json.error ?? "Unknown error"}`);
    } else if (json.status === "waiting_for_approval") {
      toast.message(`${commandName} waiting for approval: ${json.reason}`);
    } else {
      toast.success(`${commandName} ${json.status}`);
    }
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Command test console</h3>
      <div className="mt-4 grid gap-3">
        <Input {...form.register("ticket_id")} />
        <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
        <Input {...form.register("reason")} />
        <Input {...form.register("agent_name")} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => submit(true)}>Run dry-run</Button>
          <Button type="button" onClick={() => submit(false)}>Run execution</Button>
        </div>
      </div>
    </Card>
  );
}
