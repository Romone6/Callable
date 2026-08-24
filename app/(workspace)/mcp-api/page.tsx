import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { ApiKeyManager } from "@/components/app-shell/api-key-manager";
import { CopyButton } from "@/components/shared/copy-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { getAgentVerificationRecords, isVerificationEmailConfigured } from "@/lib/agent-verification-service";

export default async function McpApiPage() {
  const { organisationId } = await getDevContext();
  const [keys, commands, verifications] = await Promise.all([
    prisma.apiKey.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } }),
    prisma.actionCommand.findMany({ where: { organisationId, status: "published" }, orderBy: { createdAt: "desc" } }),
    getAgentVerificationRecords(organisationId),
  ]);
  const emailConfigured = isVerificationEmailConfigured();

  const sampleCommand = commands[0];
  const endpointSnippet = sampleCommand
    ? `POST /api/mcp\nAuthorization: Bearer <api_key>\n{\n  "tool": "run_command",\n  "args": {\n    "command_name": ${JSON.stringify(sampleCommand.name)},\n    "agent_name": "agent-1",\n    "input": ${JSON.stringify(sampleCommand.inputSchemaJson, null, 2)}\n  }\n}`
    : null;

  return (
    <>
      <Breadcrumbs current="MCP / API" />
      <PageHeader label="MCP / API" title="Agent gateway and API keys" description="All tool responses are database-backed and API-key scoped." />
      <div className="grid gap-4 md:grid-cols-[420px_1fr]">
        <ApiKeyManager />
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">MCP command contract</h3>
            {endpointSnippet && <CopyButton value={endpointSnippet} />}
          </div>
          {endpointSnippet ? <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{endpointSnippet}</pre> : <p className="mt-3 text-sm text-[var(--muted-text)]">Publish a command to generate a real request example from its current input schema.</p>}
          <p className="mt-3 text-xs text-[var(--muted-text)]">Required scopes: commands:read, commands:run, executions:read, audit:read.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/api/health" className="rounded-full border border-[var(--border-lime)] bg-lime-300/10 px-3 py-1.5 text-lime-200 transition hover:bg-lime-300/20">GET /api/health</Link>
            <Link href="/api/agent/commands" className="rounded-full border border-[var(--border-lime)] bg-lime-300/10 px-3 py-1.5 text-lime-200 transition hover:bg-lime-300/20">GET /api/agent/commands</Link>
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-semibold">Agent verification</h3>
        <p className="mt-1 text-sm text-[var(--muted-text)]">An agent is verified after it retrieves the live command list and completes a successful dry run. Callable then emails the workspace owner or admin when delivery is configured.</p>
        {verifications.length === 0 ? <p className="mt-3 text-sm text-[var(--muted-text)]">Create an API key, connect it to an agent, then let the agent call list_commands and dry_run_command.</p> : (
          <div className="mt-3 grid gap-2 text-sm">
            {verifications.map((verification) => <div key={verification.apiKeyId} className="rounded-lg border border-white/10 p-3">
              <p className="font-medium">{verification.agentName}: {verification.status.state.replaceAll("_", " ")}</p>
              <p className="mt-1 text-xs text-[var(--muted-text)]">Command list: {verification.listedAt?.toISOString() ?? "not retrieved"} · Dry run: {verification.dryRunAt?.toISOString() ?? "not completed"} · Email: {verification.emailSent ? "sent" : emailConfigured ? "pending" : "delivery unavailable"}</p>
            </div>)}
          </div>
        )}
      </Card>
      <Card>
        <h3 className="text-lg font-semibold">Published command schemas</h3>
        {commands.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No published commands" description="Publish commands from the command registry to expose schemas here." />
          </div>
        ) : (
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(commands.map((command) => ({ name: command.name, input_schema: command.inputSchemaJson, output_schema: command.outputSchemaJson })), null, 2)}</pre>
        )}
      </Card>
      <Card>
        <h3 className="text-lg font-semibold">API key records</h3>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(keys.map((key) => ({ id: key.id, name: key.name, scopes: key.scopesJson, created_at: key.createdAt.toISOString(), last_used_at: key.lastUsedAt?.toISOString() ?? "No data yet" })), null, 2)}</pre>
      </Card>
    </>
  );
}
