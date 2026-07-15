"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DriftCheckCard({
  commands,
}: {
  commands: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();

  async function runCheck(commandId: string) {
    const response = await fetch(`/api/drift/check/${commandId}`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Drift check failed"));
      return;
    }
    toast.success(`Drift check: ${json.check?.status ?? "completed"}`);
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Run drift check</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {commands.map((command) => (
          <Button key={command.id} type="button" variant="secondary" size="sm" onClick={() => runCheck(command.id)}>
            {command.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
