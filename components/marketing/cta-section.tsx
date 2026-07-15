import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8 shadow-[var(--shadow-glow)]">
      <h2 className="max-w-3xl text-4xl font-semibold leading-tight">{title}</h2>
      <p className="mt-3 max-w-2xl text-[var(--muted-text)]">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard">Open Workspace</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/mcp-api">View MCP/API Surface</Link>
        </Button>
      </div>
    </section>
  );
}
