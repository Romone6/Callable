import { SectionLabel } from "@/components/shared/section-label";
import { FeatureCard } from "@/components/marketing/feature-card";
import { CTASection } from "@/components/marketing/cta-section";
import { PlatformArchitectureDiagram } from "@/components/marketing/platform-architecture-diagram";

const modules = [
  "App Connector",
  "Workflow Discovery",
  "Command Generator",
  "Command Registry",
  "Execution Engine",
  "Approval Layer",
  "Drift Monitor",
  "Audit Logs",
  "MCP/API Gateway",
];

export default function ProductPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8">
        <SectionLabel>Product</SectionLabel>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight">The agent-native command layer for existing software.</h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted-text)]">
          VerblLayer discovers workflows from real operational evidence and compiles them into commands AI agents can execute safely.
        </p>
      </section>
      <section className="mt-6">
        <PlatformArchitectureDiagram />
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {modules.map((moduleName) => (
          <FeatureCard key={moduleName} title={moduleName} body="Real data-backed module with typed schemas, status visibility, and governance controls." />
        ))}
      </section>
      <section className="mt-8">
        <CTASection title="Ready to turn workflows into agent commands?" description="Use your existing stack, enforce governance, and expose safe execution interfaces." />
      </section>
    </main>
  );
}

