import { SectionLabel } from "@/components/shared/section-label";
import { PricingCard } from "@/components/marketing/pricing-card";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8 text-center">
        <SectionLabel className="mx-auto">Pricing</SectionLabel>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">Simple, transparent pricing that scales with you.</h1>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <PricingCard plan="Starter" price="$199/mo" items={["1 connected app", "3 published commands", "10,000 command calls / month", "Standard drift monitoring"]} />
        <PricingCard plan="Growth" price="$699/mo" featured items={["10 connected apps", "25 published commands", "100,000 command calls / month", "Advanced approval rules"]} />
        <PricingCard plan="Enterprise" price="Custom" items={["Unlimited connected apps", "Unlimited published commands", "Custom command volume", "Advanced governance and support"]} />
      </section>
      <section className="mt-8">
        <Card>
          <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          <div className="mt-4">
            <FAQAccordion items={[
              { question: "Can I change plans later?", answer: "Yes. Upgrades and downgrades are available through account management." },
              { question: "Where is my data stored?", answer: "Data is stored in your configured workspace infrastructure." },
              { question: "Do you offer annual billing?", answer: "Yes. Annual billing is available on Growth and Enterprise plans." },
            ]} />
          </div>
        </Card>
      </section>
    </main>
  );
}

