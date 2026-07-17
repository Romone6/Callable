# Customer-value core design

## Decision

Build the smallest production path for support-operations teams: authenticated console access, a single real Zendesk connector, guided command publication, command versions, evidence visibility, and automatic pause after repeated real execution failures.

## Why this shape

The existing Acme target proves execution but does not let a customer connect their own system. Zendesk is the first real external target because the current workflow, data model, and approval story already centre on support tickets and refunds. The product remains a command layer, not an RPA suite or connector catalogue.

## Product flow

1. A trusted identity proxy authenticates the console user and passes a signed shared-secret header, organisation slug, and email. Callable resolves the already-provisioned user and its database role.
2. An owner registers either the built-in Acme target or Zendesk. Zendesk credentials remain server environment variables; the database stores variable names, never the secret.
3. Evidence produces a review candidate. The candidate card shows its persisted evidence references.
4. An operator uses a guided editor to choose the reviewed API route, method, and amount threshold. JSON remains only for arbitrary input/output schemas.
5. Publish stores an immutable command version snapshot.
6. An agent executes over REST or MCP. The executor uses the command app, step HTTP method, and a route template with encoded input substitutions. It has specific real Zendesk support-ticket update handling and reports unavailable credentials truthfully.
7. Three consecutive failed executions pause the command and write an audit record. Drift remains a route-level check.

## Boundaries

- `trusted_proxy` authentication depends on a reverse proxy that strips client-supplied identity headers and injects `x-callable-auth-secret`, `x-callable-org`, and `x-callable-email`. It provisions no users automatically.
- Zendesk supports one concrete operation: update a ticket. It uses configured environment variable names for an API token and agent email; no secrets are stored in PostgreSQL.
- Command versions are append-only snapshots created on publish. There is no generic release workflow, background queue, browser fallback, OAuth client, or connector framework.
- Automatic pausing is a fixed three-consecutive-failure safety guard. It is not an incident-management system.

## Acceptance criteria

- Production rejects development authentication and accepts only configured trusted-proxy identity.
- A Zendesk command calls the real Zendesk API when configured, and reports a real missing-credential error otherwise.
- A command runs against its registered app base URL using its approved HTTP method and route template.
- Publishing creates a version snapshot; changing a command requires a new publish to create a further snapshot.
- Three sequential execution failures pause the command and create a persisted audit event.
- The command editor no longer exposes raw execution-step JSON or raw approval-rule JSON.
- Unit/build/lint checks pass. Database and browser proof remains explicitly pending until Docker virtualization is restored.
