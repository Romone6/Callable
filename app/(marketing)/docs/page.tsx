import Link from "next/link";
import { SectionLabel } from "@/components/shared/section-label";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/shared/copy-button";

const mcpConfig = `{
  "mcpServers": {
    "verblayer": {
      "command": "npx",
      "args": ["@verblayer/mcp-server"],
      "env": {
        "VERBLLAYER_API_KEY": "vl_live_xxxxx"
      }
    }
  }
}`;

const commandRunContract = `POST /api/agent/commands/issue_refund_from_ticket/run
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "agent_name": "support-agent",
  "input": {
    "ticket_id": "TCK-1049",
    "amount": 75,
    "reason": "duplicate billing"
  }
}`;

const successResponse = `{
  "status": "succeeded",
  "execution_id": "exec_...",
  "output": {
    "refund_id": "RF-...",
    "ticket_status": "refund_issued",
    "status": "succeeded"
  },
  "execution_mode": "api"
}`;

const approvalResponse = `{
  "status": "waiting_for_approval",
  "approval_required": true,
  "reason": "amount exceeds approval threshold",
  "execution_id": "exec_..."
}`;

const failedResponse = `{
  "status": "failed",
  "execution_id": "exec_...",
  "error": "Input validation failed: Missing required field: reason"
}`;

const docsSections = [
  { href: "#quickstart", label: "Quickstart" },
  { href: "#mcp-config", label: "MCP Config" },
  { href: "#run-contract", label: "Run Contract" },
  { href: "#response-contracts", label: "Response Contracts" },
  { href: "#live-endpoints", label: "Live Endpoints" },
] as const;

export default function DocsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8">
        <SectionLabel>Docs</SectionLabel>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">Give your agents commands, not screenshots.</h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted-text)]">Developer-first quickstart for apps, discovery, command lifecycle, approvals, drift monitor, and audit logs.</p>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-[280px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Docs nav</h2>
          <nav className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted-text)]" aria-label="Documentation sections">
            {docsSections.map((section) => (
              <Link key={section.href} href={section.href} className="transition hover:text-white focus-visible:text-white">
                {section.label}
              </Link>
            ))}
          </nav>
        </Card>
        <div className="grid gap-4">
          <Card id="quickstart">
            <h2 className="text-lg font-semibold">Quickstart</h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted-text)]">
              <li>1. Register an app in <Link href="/apps" className="text-lime-200 hover:underline">Workspace / Apps</Link>.</li>
              <li>2. Upload workflow evidence in <Link href="/discovery-sources" className="text-lime-200 hover:underline">Discovery Sources</Link>.</li>
              <li>3. Run discovery and publish commands from <Link href="/discover-commands" className="text-lime-200 hover:underline">Discover Commands</Link>.</li>
              <li>4. Execute through agent routes in <Link href="/mcp-api" className="text-lime-200 hover:underline">MCP / API</Link>.</li>
            </ol>
          </Card>
          <Card id="mcp-config">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">MCP configuration</h2>
              <CopyButton value={mcpConfig} />
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{mcpConfig}</pre>
            <p className="mt-3 text-sm text-[var(--muted-text)]">Use an API key with scopes: commands:read, commands:run, executions:read, audit:read.</p>
          </Card>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card id="run-contract">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Run command contract</h2>
            <CopyButton value={commandRunContract} />
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{commandRunContract}</pre>
        </Card>
        <Card id="response-contracts">
          <h2 className="text-lg font-semibold">Contract responses</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)]">All command run entrypoints return one of these shapes.</p>
          <div className="mt-3 grid gap-3">
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{successResponse}</pre>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{approvalResponse}</pre>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{failedResponse}</pre>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <Card id="live-endpoints">
          <h2 className="text-lg font-semibold">Live endpoints</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)]">Use these runtime routes directly in local verification and agent integration scripts.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/api/health" className="rounded-full border border-[var(--border-lime)] bg-lime-300/10 px-3 py-2 text-lime-200 transition hover:bg-lime-300/20">GET /api/health</Link>
            <span className="rounded-full border border-[var(--border-lime)] bg-lime-300/10 px-3 py-2 text-lime-200">POST /api/mcp (use MCP client)</span>
            <Link href="/api/agent/commands" className="rounded-full border border-[var(--border-lime)] bg-lime-300/10 px-3 py-2 text-lime-200 transition hover:bg-lime-300/20">GET /api/agent/commands</Link>
          </div>
        </Card>
      </section>
    </main>
  );
}

