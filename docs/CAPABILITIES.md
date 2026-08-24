# Capabilities, strengths, and limits

## Real capabilities

| Capability | Status | Evidence boundary |
| --- | --- | --- |
| Workflow evidence persistence | Implemented | Stored in PostgreSQL; fresh Docker-backed release proof remains pending. |
| LLM workflow discovery | Available when configured | Calls the selected provider; missing keys return a real configuration error. |
| Command generation | Implemented | Produces a review draft only; no execution path is inferred. |
| Acme API command execution | Implemented | Uses the command's persisted app, reviewed method, and route template; full release-gate proof remains pending. |
| Zendesk ticket update | Implemented, live proof pending | Calls Zendesk's real ticket API and stores only server environment-variable names; sandbox credential proof has not been run. |
| Salesforce connection | Implemented, live proof pending | Calls the configured Salesforce REST API limits endpoint with a server-only bearer-token variable. Execution is unavailable until a narrow operation is built and live-verified. |
| Dry run | Implemented | Validates command input and logs a dry-run execution without target side effects. |
| Threshold approvals | Implemented | Persists pending/approved/rejected approval records. |
| Drift checks | Implemented | Checks the persisted target app's configured API route reachability and persists the result. |
| Command versions | Implemented | Every publish creates an immutable persisted snapshot of the command contract and reviewed steps. |
| Repeated failure safety pause | Implemented | Three consecutive non-dry-run failures pause a published command and create an audit event. |
| REST/MCP/OpenAPI | Implemented | Scoped API-key access with persisted audit events. |
| Agent verification and completion email | Implemented, delivery proof pending | Callable verifies a successful MCP command-list request followed by a successful dry run, then sends the real inventory to an owner/admin when Resend is configured. |

## Strengths

- The core flow is small, traceable, and persisted end-to-end.
- The command boundary is safer after removing automatic target inference and browser fallback.
- Tenant-sensitive approval, drift, and target execution paths are scoped to a persisted organisation.
- The controlled target gives contributors a real integration surface without needing SaaS credentials.

## Weaknesses and next expansion candidates

- Production console access works only behind a trusted identity proxy; this core intentionally provides no hosted login or user provisioning.
- Execution supports the controlled target and one narrow Zendesk ticket-update adapter. Add any future connector one at a time, with an explicit live contract and no catalog-only claim.
- There is no distributed work queue or distributed rate limiter. Introduce these only with an operational need and real deployment tests.
- API drift is route-level, not semantic contract validation. Add schema assertions once the connector contract is stable.
- Discovery quality depends on external model configuration; add evaluation fixtures from redacted real evidence before tuning prompts.
