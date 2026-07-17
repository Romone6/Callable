# Local runbook

## Setup

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:up
pnpm prisma:migrate:deploy
pnpm prisma:seed
pnpm dev
```

Postgres is the only required container and is exposed at `localhost:55432`. New installations use the Callable Postgres defaults. The rebranded Compose configuration deliberately reuses the existing local Docker data volume, so an upgraded installation keeps both its persisted records and its existing `DATABASE_URL` until its database is deliberately migrated. `DEV_AUTH_ENABLED=true` is only for local development and test. Production requires `AUTH_MODE=trusted_proxy`, `DEV_AUTH_ENABLED=false`, and a 32+ character `TRUSTED_AUTH_PROXY_SECRET`. Set a long `INTERNAL_EXECUTION_TOKEN` before exposing a controlled target.

## Production console authentication

Place an identity-aware reverse proxy in front of the console. It must remove any client-provided `x-callable-auth-secret`, `x-callable-org`, and `x-callable-email` headers, authenticate the request, then inject all three headers itself. The secret must exactly match `TRUSTED_AUTH_PROXY_SECRET`; the organization slug and email must match a pre-provisioned database user. Callable does not create users from headers and uses only the persisted database role for authorization.

## Real smoke flow

1. Register the local Acme Support Admin target at `/apps` and run its real `/api/health` connection test.
2. Upload real SOP, CSV, trace, or process text at `/discovery-sources`.
3. Run discovery at `/discover-commands` with a configured provider key. If absent, the UI/API reports discovery as unavailable.
4. Accept a real candidate. Generated commands intentionally contain no execution step.
5. On the command page, enter the reviewed API route, HTTP method, schemas, and optional approval threshold, then publish. Every publish creates an immutable command-version snapshot.
6. Run with an amount below the threshold; run above the threshold and approve it at `/approvals`.
7. Inspect `/executions`, `/drift-monitor`, and `/audit-logs`.

## Zendesk ticket update flow

1. Set real server environment values such as `ZENDESK_API_TOKEN` and `ZENDESK_AGENT_EMAIL`; do not put values in the app form.
2. At `/apps`, choose **Zendesk ticket updates**, enter `https://your-subdomain.zendesk.com`, then enter only the two environment-variable names.
3. Run **Test connection**. Callable calls Zendesk's real `GET /api/v2/users/me.json` endpoint and records the actual remote error if credentials or connectivity are invalid.
4. Create a command on that app with route `/api/v2/tickets/{ticket_id}.json` and method `PUT`. Its input must include `ticket_id` and one or more of `status`, `priority`, or `comment`.
5. A live run uses Zendesk's real ticket-update API. Three consecutive non-dry-run failures pause the currently published command and create an audit record; a dry run never counts toward that guard.

## Agent API / MCP

Create a scoped API key in `/mcp-api`, then call:

```powershell
$headers = @{ Authorization = "Bearer <api_key>"; "Content-Type" = "application/json"; "x-idempotency-key" = "demo-1" }
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/mcp" -Headers $headers -Body '{"tool":"list_commands","args":{}}'
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/v1/openapi"
```

## Verification

```powershell
pnpm lint
pnpm test
pnpm build
pnpm playwright:test
pnpm verify
```

Use `pnpm prisma:migrate:deploy`, never `prisma migrate dev`, for a shared database. The `20260715000000_open_source_core` migration intentionally drops enterprise-only tables; take a backup before applying it to any retained database. The additive `20260716000000_customer_value_core` migration adds command versions and dry-run marking.

## Release preflight

Before cutting a public release, use a fresh Postgres database and run:

```powershell
pnpm install --frozen-lockfile
pnpm prisma:migrate:deploy
pnpm prisma:seed
pnpm lint
pnpm test
pnpm build
pnpm playwright:test
```

Then review GitHub Dependabot alerts after the public remote is configured. `pnpm audit` is not included because the installed pnpm audit endpoint currently returns HTTP 410; do not treat that tooling error as an audit result. Prove the controlled Acme lifecycle and, if Zendesk is advertised as verified, test a real Zendesk sandbox with production-like trusted-proxy headers. Record exact results in `implementation.md`. A public release also requires remote CI, protected default-branch rules, and a configured private security contact.
