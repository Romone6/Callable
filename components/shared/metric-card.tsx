import { Card } from "@/components/ui/card";

export function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted-text)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {note ? <p className="mt-1 text-xs text-[var(--muted-text)]">{note}</p> : null}
    </Card>
  );
}

