# Open-source Core Design

## Decision

Callable becomes a self-hosted command layer, not an enterprise SaaS control plane. The default runtime is one Next.js application backed by Postgres, with one real Acme sample target and synchronous execution.

## Public core

The maintained flow is: register an app, ingest evidence, discover or manually create a candidate, review its executable steps, publish, invoke through REST or MCP, require approval when configured, execute against the selected app, and record audit and drift outcomes.

`CommandStep` remains the execution contract. Command generation must not invent Acme refund selectors or routes; publishing fails when a command has no explicit executable step.

## Excluded from the default distribution

Enterprise identity, SCIM, SSO, compliance exports, scheduled cron jobs, Redis/BullMQ, SLO dashboards, auto-send simulation, object storage, and unfinished provider adapters are removed rather than retained as unsupported surface area.

## Safety boundaries

All resource mutations are organisation-scoped. Development auth is permitted only in development and test. Production requires explicit authentication and non-default secrets. The sample target resolves its organisation from server-controlled execution context rather than a caller-supplied header.

## Verification model

CI proves local, persisted behaviour with Postgres. Discovery configuration failure is tested separately from lifecycle execution. Live LLM discovery is opt-in and never replaced with a fabricated candidate.
