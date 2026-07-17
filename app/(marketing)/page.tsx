import Link from "next/link";

const capabilities = [
  "Persist real workflow evidence and discover candidates with a configured LLM provider.",
  "Require an accepted candidate, reviewed API step, schema, risk level, and approval rules before publishing.",
  "Execute only against a real controlled target, with dry-run, idempotency, audit records, approvals, and drift checks.",
  "Expose published commands to agents through scoped API keys, REST, MCP, and OpenAPI.",
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-200">Open-source command layer</p>
      <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">Make a verified business workflow safely callable by an agent.</h1>
      <p className="mt-6 max-w-3xl text-lg text-[var(--muted-text)]">Callable is a self-hosted command layer for real software. It does not simulate discovery, execution, audit activity, or health.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-lg bg-lime-300 px-4 py-2 font-medium text-emerald-950">Open local workspace</Link>
        <a href="https://github.com" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-lime-200">View source</a>
      </div>
      <section id="product" className="mt-20 grid gap-4 md:grid-cols-2">
        {capabilities.map((capability, index) => <article key={capability} className="rounded-2xl border border-white/10 bg-white/5 p-6"><span className="text-sm text-lime-200">0{index + 1}</span><p className="mt-3 text-lg">{capability}</p></article>)}
      </section>
      <section id="quickstart" className="mt-16 rounded-2xl border border-lime-300/30 bg-lime-300/10 p-6">
        <h2 className="text-2xl font-semibold">Local quick start</h2>
        <pre className="mt-4 overflow-auto rounded-lg bg-black/30 p-4 text-sm text-lime-100">pnpm install{"\n"}copy .env.example .env{"\n"}pnpm db:up{"\n"}pnpm prisma:migrate:deploy{"\n"}pnpm prisma:seed{"\n"}pnpm dev</pre>
      </section>
    </main>
  );
}
