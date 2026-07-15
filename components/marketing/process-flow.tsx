import { Card } from "@/components/ui/card";

const steps = [
  "Add your tools and workflow evidence",
  "Discover repeated workflows",
  "Generate typed commands",
  "Review and publish",
  "Agents execute via MCP or API",
];

export function ProcessFlow() {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-lime)]">How VerblLayer works</p>
      <h2 className="mt-3 text-3xl font-semibold">From repeated workflows to agent commands</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-semibold text-[var(--accent-lime)]">{index + 1}</p>
            <p className="mt-1 text-sm text-[var(--muted-text)]">{step}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

