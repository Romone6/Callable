"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/utils/api-error";

type FailedJob = {
  id: string;
  name: string;
  failed_reason: string | null;
  attempts_made: number;
};

type QueueItem = {
  queue: "execution" | "drift";
  queue_name: string;
  counts: {
    failed: number;
    waiting: number;
    active: number;
    completed: number;
    delayed: number;
    paused: number;
    prioritized: number;
  };
  failed_jobs: FailedJob[];
};

type QueueHealthResponse = {
  queue_enabled: boolean;
  queue_mode: string;
  queues: QueueItem[];
};

export function QueueTriagePanel({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<QueueHealthResponse | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const hasFailures = useMemo(() => {
    return (report?.queues ?? []).some((queue) => queue.failed_jobs.length > 0);
  }, [report]);

  async function load(options?: { showSpinner?: boolean }) {
    if (options?.showSpinner) {
      setLoading(true);
    }
    const response = await fetch("/api/ops/queue-health?failed_limit=25");
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to load queue health"));
      setLoading(false);
      return;
    }
    setReport(json as QueueHealthResponse);
    setLoading(false);
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load queue health");
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  async function replay(queue: "execution" | "drift", jobId: string) {
    setActionBusyId(`replay:${queue}:${jobId}`);
    const response = await fetch("/api/ops/queue-health/replay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queue, job_id: jobId }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to replay failed job"));
      setActionBusyId(null);
      return;
    }
    toast.success("Failed job replayed");
    setActionBusyId(null);
    await load({ showSpinner: true });
    router.refresh();
  }

  async function acknowledge(queue: "execution" | "drift", jobId: string) {
    setActionBusyId(`ack:${queue}:${jobId}`);
    const response = await fetch("/api/ops/queue-health/ack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queue, job_id: jobId, note: "Acknowledged from ops triage UI" }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(getApiErrorMessage(json, "Unable to acknowledge failed job"));
      setActionBusyId(null);
      return;
    }
    toast.success("Failed job acknowledged and removed");
    setActionBusyId(null);
    await load({ showSpinner: true });
    router.refresh();
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-text)]">Loading queue triage status...</p>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-text)]">Queue triage status unavailable.</p>
      </Card>
    );
  }

  if (!report.queue_enabled) {
    return (
      <Card>
        <h3 className="text-lg font-semibold">Queue triage</h3>
        <p className="mt-2 text-sm text-[var(--muted-text)]">Queue mode is currently `{report.queue_mode}`. No failed-job triage actions available.</p>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Queue triage</h3>
          <p className="text-sm text-[var(--muted-text)]">Review failed jobs and either replay or acknowledge/remove after incident triage.</p>
        </div>
        <Badge variant={hasFailures ? "warning" : "success"}>{hasFailures ? "Failed jobs present" : "No failed jobs"}</Badge>
      </div>

      {!canManage ? (
        <p className="text-sm text-[var(--muted-text)]">Read-only mode: replay and acknowledge actions require operator/admin/owner privileges.</p>
      ) : null}

      {(report.queues ?? []).map((queue) => (
        <div key={queue.queue} className="rounded-xl border border-white/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold">{queue.queue_name}</h4>
            <p className="text-xs text-[var(--muted-text)]">failed={queue.counts.failed} waiting={queue.counts.waiting} active={queue.counts.active}</p>
          </div>

          {queue.failed_jobs.length === 0 ? (
            <p className="text-sm text-[var(--muted-text)]">No failed jobs for this queue.</p>
          ) : (
            <div className="space-y-2">
              {queue.failed_jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-white/10 p-3">
                  <p className="text-sm font-medium">{job.name}</p>
                  <p className="text-xs text-[var(--muted-text)]">Job ID: {job.id}</p>
                  <p className="text-xs text-[var(--muted-text)]">Attempts: {job.attempts_made}</p>
                  <p className="text-xs text-[var(--muted-text)]">Reason: {job.failed_reason ?? "Unknown failure"}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => replay(queue.queue, job.id)}
                      disabled={!canManage || actionBusyId !== null}
                    >
                      Replay
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => acknowledge(queue.queue, job.id)}
                      disabled={!canManage || actionBusyId !== null}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
