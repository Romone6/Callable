import { HeroSection } from "@/components/marketing/hero-section";
import { CommandPreviewCard } from "@/components/marketing/command-preview-card";
import { ProcessFlow } from "@/components/marketing/process-flow";
import { CTASection } from "@/components/marketing/cta-section";
import { FeatureCard } from "@/components/marketing/feature-card";
import { LogoCloud } from "@/components/marketing/logo-cloud";

const features = [
  {
    title: "Secure by design",
    body: "Built with permissions, risk levels, approvals and audit logs at every layer.",
  },
  {
    title: "No clean API? No problem.",
    body: "Execute through real APIs or controlled browser automation for legacy dashboards.",
  },
  {
    title: "Agent-ready",
    body: "Expose commands via MCP and REST API with typed schemas and status endpoints.",
  },
  {
    title: "Drift resistant",
    body: "Run real checks for route availability, selectors, fields and execution smoke.",
  },
];

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-14 md:grid-cols-4 md:px-6">
        {features.map((feature) => (
          <FeatureCard key={feature.title} title={feature.title} body={feature.body} />
        ))}
      </section>
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 md:px-6">
        <ProcessFlow />
      </section>
      <LogoCloud />
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 md:grid-cols-2 md:px-6">
        <CTASection
          title="Turn your existing software into agent-executable commands."
          description="Book a personalized demo and see the command layer in action across your current workflows."
        />
        <CommandPreviewCard />
      </section>
    </main>
  );
}

