"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils/api-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

export function DiscoveryRunPanel({
  apps,
  sources,
}: {
  apps: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string; type: string }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [appId, setAppId] = useState("");
  const [pending, setPending] = useState(false);

  async function runDiscovery() {
    try {
      setPending(true);
      const response = await fetch("/api/discovery/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app_id: appId || undefined, source_ids: selected }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error(getApiErrorMessage(json, "Discovery failed"));
      } else {
        toast.success(Array.isArray(json.candidates) ? `${json.candidates.length} candidates discovered` : "Discovery completed");
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Run workflow discovery</h3>
      <div className="mt-4 grid gap-3">
        <Select value={appId} onChange={(event) => setAppId(event.target.value)}>
          <option value="">Not connected</option>
          {apps.map((app) => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </Select>
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
          {sources.map((source) => {
            const checked = selected.includes(source.id);
            return (
              <label key={source.id} className="flex items-center gap-2 text-sm text-[var(--muted-text)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setSelected((current) => event.target.checked ? [...current, source.id] : current.filter((id) => id !== source.id))
                  }
                />
                <span>{source.name} ({source.type})</span>
              </label>
            );
          })}
        </div>
        <Button type="button" onClick={runDiscovery} disabled={pending || selected.length === 0}>
          {pending ? "Running..." : "Run discovery"}
        </Button>
      </div>
    </Card>
  );
}
