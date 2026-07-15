import { SectionLabel } from "@/components/shared/section-label";
import { Card } from "@/components/ui/card";

const principles = [
  "Commands over clicks",
  "Safety over blind automation",
  "Existing stack first",
  "Human approval where it matters",
  "Drift-resistant infrastructure",
  "Auditability by default",
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8">
        <SectionLabel>About</SectionLabel>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight">We make existing software usable by AI agents.</h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted-text)]">VerblLayer helps teams wrap real operational software with governed command interfaces.</p>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {principles.map((principle) => (
          <Card key={principle}><p className="text-sm text-[var(--muted-text)]">{principle}</p></Card>
        ))}
      </section>
    </main>
  );
}

