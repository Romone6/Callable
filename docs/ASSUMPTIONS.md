# ASSUMPTIONS.md

1. Local development defaults to `AUTH_MODE=dev`; production requires `AUTH_MODE=clerk` and valid Clerk keys.
2. Discovery provider is selected by `DISCOVERY_PROVIDER` and fails with explicit config errors when provider keys are missing.
3. External SaaS integrations are not connected in this MVP and are shown as `unavailable` / `not connected`.
4. Execution entrypoints use BullMQ + Redis orchestration when `EXECUTION_QUEUE_ENABLED=true`; queue jobs are awaited inline in MVP request flow for deterministic API responses.
5. Agent and MCP routes require bearer API keys with scopes.
6. Phase 2 connector credentials are configured by environment variable names stored in app metadata (`auth_env_key`, `username_env_key`) so raw third-party secrets are not persisted in the database.
7. Provider-specific execution behavior is selected via app metadata `provider_operation` where applicable (`create_refund` / `retrieve_refund` for Stripe, `update_ticket` for Zendesk, `update_contact` for HubSpot).
8. Phase 3 RBAC baseline roles are `owner`, `admin`, `operator`, `reviewer`, and `viewer`; unknown roles are treated as `viewer` for least-privilege safety.
9. `/api/health` reports real dependency readiness (`database`, `redis`, `auth`) and returns `503` when any required check is in `error`.
10. Playwright E2E webServer runs with `EXECUTION_QUEUE_ENABLED=false` for deterministic browser lifecycle tests; queue execution remains covered in integration tests (`tests/integration/queue-execution.test.ts`).
11. Prisma CLI/runtime configuration is sourced from `prisma.config.ts`; deprecated `package.json#prisma` configuration is not used.
12. Vitest file-level parallelism is disabled for stable DB/queue integration execution in the Phase 4 verification gate.
13. `GET /api/ops/slo-summary` reports rolling-window aggregate metrics from `command_executions`, `drift_checks`, and pending approvals; configurable SLO target thresholds/alerting are deferred to a later slice.
14. `GET/POST /api/ops/slo-alerts` evaluate SLO breaches from rolling summary data; webhook dispatch requires either `webhook_url` payload field or `SLO_ALERT_WEBHOOK_URL` environment configuration.
15. Security-policy IP allowlist supports both exact IP entries and IPv4 CIDR entries (for example `203.0.113.0/24`) for API-key request enforcement.
16. Queue triage controls expose both replay (`/api/ops/queue-health/replay`) and acknowledgement/removal (`/api/ops/queue-health/ack`) for failed queue jobs, with operator/admin/owner write access.
17. Custom roles are stored as `custom:<role_key>` in `users.role`, with permissions registered at request-context resolution time from `custom_roles.permissions_json`.
18. Marketing CTA routes currently target live in-product paths (/dashboard, /docs, /mcp-api) because dedicated public booking/sales endpoints are not yet implemented.
19. `/api/v1/openapi` publishes the currently supported REST/MCP-facing contract surface for GA consumers and is served as no-store runtime JSON.
20. `/api/mcp/audit` is API-key protected (`audit:read`) and returns only `mcp_tool_invocation` events scoped to the caller organisation, with optional `tool`, `outcome`, `limit`, and `before` filtering.
21. `/api/audit/events` is API-key protected (`audit:read`) and supports scoped filtering (`event_type`, `actor_type`, `actor_id`, `command_id`, `execution_id`) plus cursor-style pagination using `before` + `limit`.
22. Approval governance policies are stored in `approval_policies` and managed via `GET/POST/PATCH /api/approval-policies`; policy graph is represented in `policy_json` (thresholds, stages, scenario gates, exception paths, role approvers, SLA timers).
23. Command execution approval routing uses command-level `approval_rules_json` when present; otherwise it falls back to the active default org approval policy (`is_default=true`, `status=active`) for threshold/stage evaluation.
24. `POST /api/auto-send/simulate` is a decision-simulation endpoint only; it does not dispatch messages or execute side effects. It returns explicit blocker codes for high-risk category, scenario allowlist mismatch, confidence threshold, zero-tolerance violations, bypass prevention, and approval-threshold triggers.
25. Every auto-send simulation creates an immutable `send_events` ledger entry and can be retrieved via `GET /api/send-events/{id}` with decision snapshot, reviewer state, risk state, connector target, and delivery state.

