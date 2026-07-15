import { SectionLabel } from "@/components/shared/section-label";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog";

const ordered = [...CONNECTOR_CATALOG].sort((a, b) => a.label.localeCompare(b.label));

export default function IntegrationsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8">
        <SectionLabel>Integrations</SectionLabel>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">Connect VerblLayer to the tools your business already runs.</h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted-text)]">No clean API? VerblLayer supports controlled browser automation for supported workflows.</p>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {ordered.map((integration) => (
          <Card key={integration.providerKey}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{integration.label}</h3>
              <StatusBadge value={integration.status} />
            </div>
            <p className="mt-2 text-sm text-[var(--muted-text)]">{integration.category}</p>
          </Card>
        ))}
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-3xl font-semibold">No clean API? No problem.</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)]">For supported workflows, VerblLayer can execute actions through controlled browser automation with step-level logs.</p>
        </Card>
        <Card>
          <h2 className="text-3xl font-semibold">Status policy</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)]">Only implemented integrations are marked available or in development. Unimplemented connectors are labeled unavailable until delivered.</p>
        </Card>
      </section>
    </main>
  );
}

