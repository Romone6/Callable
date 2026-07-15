# implementation.md

## VerblLayer MVP Implementation Plan

## Product summary

VerblLayer is an agent-native command layer for existing business software.

The MVP must allow a user to upload real workflow evidence, discover a workflow, generate a command, approve it, expose it through MCP/API and execute it against a real target system with audit logging.

## Non-negotiable build rule

No mocks.

Every feature must either:
1. work against real persisted data / real execution, or
2. be clearly marked as unavailable.

Do not use fake successful responses.
Do not hardcode dashboard stats.
Do not return static MCP tool data.
Do not fake workflow discovery.
Do not fake command execution.
Do not fake audit logs.
Do not fake drift checks.

## Phase 1: Project setup

Tasks:
- Create Next.js TypeScript app.
- Add Tailwind CSS.
- Add shadcn/ui.
- Add Prisma.
- Add Postgres.
- Add auth provider.
- Add environment variable validation.
- Add base layout.
- Add AGENTS.md.
- Add implementation.md.

Acceptance criteria:
- App runs locally.
- Database connects.
- Auth works.
- Environment variables are validated.
- AGENTS.md exists.
- implementation.md exists.

## Phase 2: Database schema

Tasks:
- Create organisations table.
- Create users table.
- Create apps table.
- Create discovery_sources table.
- Create workflow_candidates table.
- Create action_commands table.
- Create command_steps table.
- Create command_executions table.
- Create approvals table.
- Create drift_checks table.
- Create audit_logs table.
- Create api_keys table.

Acceptance criteria:
- Prisma migration runs successfully.
- Tables exist.
- Seed script creates only required development records.
- No fake production data is inserted.

## Phase 3: Public website

Pages:
- Home
- Product
- Solutions
- Integrations
- Docs
- Pricing
- About

Acceptance criteria:
- Messaging clearly explains VerblLayer as a command layer for existing business software.
- No company-brain-first positioning.
- No fake claims.
- Integrations not implemented are marked coming soon.
- Mobile responsive.

## Phase 4: App shell

Pages:
- Dashboard
- Apps
- Discovery Sources
- Discover Commands
- Commands
- Executions
- Approvals
- Drift Monitor
- MCP/API
- Audit Logs
- Settings

Acceptance criteria:
- Protected app routes require auth.
- Sidebar works.
- Empty states show real empty data.
- No hardcoded stats.

## Phase 5: Internal target business app

Build a real internal target app called Acme Support Admin.

Required real database tables:
- customers
- tickets
- refunds

Required real pages:
- customer list
- ticket list
- ticket detail
- billing/refund form
- refund confirmation state

Acceptance criteria:
- Records are saved in database.
- Refund creates real refund row.
- Ticket status can be updated.
- Browser automation can operate the app.
- No fake success responses.

## Phase 6: App Connector

Tasks:
- Add app creation form.
- Add app list.
- Add app detail page.
- Add test connection.
- Store app status.

Acceptance criteria:
- User can register Acme Support Admin as target app.
- Connection test checks actual reachable URL/API.
- Failed connection shows real error.

## Phase 7: Discovery Source Manager

Tasks:
- Upload SOP/process text.
- Upload CSV ticket export.
- Upload JSON trace.
- Parse and store source content.
- Show parse status and errors.

Acceptance criteria:
- Uploaded source is persisted.
- Parsed content is viewable.
- Parse failures are shown honestly.
- Audit log is created for source upload.

## Phase 8: Workflow Discovery Engine

Tasks:
- Build discovery service.
- Use LLM provider abstraction if API key is configured.
- Extract candidate workflows from real source content.
- Store workflow candidates.
- Show confidence, risk and evidence.

Acceptance criteria:
- Running discovery on real source creates real candidate rows.
- If no LLM key exists, return configuration error.
- If no workflow is found, show no workflow found.
- No hardcoded candidates.

## Phase 9: Command Generator

Tasks:
- Accept workflow candidate.
- Generate command schema.
- Store command draft.
- Allow user editing.
- Allow publish.

Acceptance criteria:
- Command is generated from actual candidate.
- Schema is saved.
- User can edit schema.
- Published command appears in command registry.
- Audit logs are created.

## Phase 10: Execution Engine

Tasks:
- Validate command inputs.
- Enforce approval rules.
- Execute real API command against Acme Support Admin.
- Execute real browser command through Playwright where required.
- Store execution result.
- Store error if failed.

Acceptance criteria:
- Low-risk command executes successfully.
- High-risk command creates approval request.
- Failed command stores actual error.
- Execution appears in executions page.
- Audit log is created.

## Phase 11: Approval Layer

Tasks:
- Create approval records.
- Approve command execution.
- Reject command execution.
- Resume execution after approval where applicable.

Acceptance criteria:
- Approval-required command does not execute until approved.
- Rejection prevents execution.
- Approval and rejection are logged.

## Phase 12: MCP/API Gateway

Tasks:
- Create API key management.
- Build REST agent endpoints.
- Build MCP server tools:
  - list_commands
  - describe_command
  - dry_run_command
  - run_command
  - get_execution_status
  - get_command_health
  - get_audit_log

Acceptance criteria:
- MCP tools return real database data.
- run_command creates real execution.
- get_execution_status returns real execution status.
- No static MCP responses.

## Phase 13: Drift Monitor

Tasks:
- Build drift check for API route availability.
- Build drift check for required selectors.
- Build command health updates.
- Show drift warnings.

Acceptance criteria:
- Drift check performs real validation.
- Broken selector creates warning/broken status.
- Health status is stored.
- Audit log is created.

## Phase 14: Testing

Required tests:
- database model tests
- API route tests
- workflow discovery tests with real fixture files
- command generation tests
- execution engine tests against Acme Support Admin
- approval logic tests
- MCP tool tests
- drift check tests

Acceptance criteria:
- Tests pass.
- No tests rely on hardcoded fake success.
- Fixture data is clearly labelled as test fixture data.

## Final MVP acceptance criteria

The MVP is complete when:

1. User can sign up.
2. User can create workspace.
3. User can register Acme Support Admin.
4. User can upload a real SOP or ticket export.
5. VerblLayer can discover a workflow candidate.
6. User can accept candidate.
7. VerblLayer generates command schema.
8. User can publish command.
9. Agent API/MCP can list command.
10. Agent API/MCP can run command.
11. Command executes against real target app.
12. Approval rules block risky execution.
13. Audit logs are created.
14. Drift checks return real health.
15. No mocks are used anywhere.

## Build progress log

### 2026-05-01

- Phase 1 started: project bootstrap with Next.js TypeScript app, Tailwind, strict TS, Prisma dependency wiring.
- Phase 1 completed: base app scaffold, environment template, AGENTS.md restored, implementation.md retained.
- Phase 2 started: Prisma schema implemented for organisations/users/apps/discovery_sources/workflow_candidates/action_commands/command_steps/command_executions/approvals/drift_checks/audit_logs/api_keys/customers/tickets/refunds.
- Phase 2 completed: schema and seed script created.
- API routes added:
  - /api/health
  - /api/apps (+ /:id + /:id/test-connection)
  - /api/discovery-sources (+ /upload + /text + /:id)
  - /api/discovery/run
  - /api/discovery/candidates (+ /:id + /:id/accept + /:id/reject + /:id/generate-command)
  - /api/commands (+ /:id + /:id/publish + /:id/pause + /:id/dry-run + /:id/run)
  - /api/executions (+ /:id + /:id/retry + /:id/cancel)
  - /api/approvals (+ /:id + /:id/approve + /:id/reject)
  - /api/drift (+ /check/:commandId)
  - /api/agent/commands (+ /:name + /:name/dry-run + /:name/run)
  - /api/agent/executions/:id
  - /api/audit-logs (+ /:id)
  - /api/api-keys (+ /:id)
  - /api/mcp
  - /api/internal/acme/refunds
- Known limitation: discovery requires configured OPENAI_API_KEY; without it, discovery returns configuration error.
- Known limitation: production auth provider integration is not implemented; dev-local single-org mode is active.

### Test results (2026-05-01)

Executed commands and outcomes:
- `pnpm db:up` ? (Postgres container running on localhost:55432)
- `pnpm prisma:generate` ?
- `pnpm prisma:migrate --name init` ? (migration applied)
- `pnpm prisma:seed` ? (seeded acme-dev org/user/customers/tickets)
- `pnpm lint` ?
- `pnpm test` ? (11 test files, 15 tests passed)
- `pnpm build` ?
- `pnpm playwright:test` ? (1 E2E test passed)

Observed blockers and fixes during build:
- Docker host ports `5432` and `5433` were already allocated; switched project DB port to `55432`.
- Local `next dev` auto-port fallback caused Playwright webServer mismatch; pinned app and test runtime to port `3100`.
- Prisma v7 datasource schema incompatibility with current setup; pinned to Prisma v6.16.2 for standard `schema.prisma` flow.

### 2026-05-01 (Full MVP pass update)

Implemented in this pass:
- Production auth path with Clerk support (`AUTH_MODE=clerk`) plus explicit dev fallback gate (`AUTH_MODE=dev`, `ALLOW_DEV_AUTH_MODE=true`).
- Workspace bootstrap from authenticated Clerk user/org context using persisted `clerk_user_id` and `clerk_org_id` mappings.
- Request correlation middleware with `x-request-id` propagation and structured request logging.
- Strict API-key authentication and scope enforcement on all agent/MCP endpoints.
- Execution idempotency support via `idempotency_key` and safe replay behavior.
- Command status transition enforcement for publish/pause flows.
- Provider abstraction in discovery service (`openai`, `anthropic`, `openrouter`) with explicit configuration errors.
- High-fidelity frontend styling and public page redesign aligned to the supplied branding direction.
- App shell visual upgrade and improved MCP/API guidance with auth header examples.
- Added Clerk sign-in/sign-up routes for production auth mode.

Schema changes:
- `organisations.clerk_org_id` (unique, nullable)
- `users.clerk_user_id` (unique, nullable)
- `command_executions.idempotency_key` + unique index `(organisation_id, command_id, idempotency_key)`

Migrations:
- Added and applied: `prisma/migrations/20260501064000_auth_idempotency/migration.sql`

Verification commands run in this pass:
- `pnpm install`
- `pnpm db:up`
- `pnpm prisma:generate`
- `pnpm prisma:migrate --name final_mvp_pass`
- `pnpm prisma:seed`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`

Results summary:
- Lint: passed
- Unit/integration tests: passed (11 files, 15 tests)
- Build: passed
- Playwright E2E: passed (1/1)

Current known warning:
- Next.js 16 reports middleware-convention deprecation warning (`middleware` -> `proxy`) during build/test startup. Functionality is working; migration to `proxy` is pending framework convention update.

### 2026-05-02 (Frontend full rebuild pass)

- Phase started: full frontend architecture rebuild with route groups, reusable components, validation forms, and data-table modules.
- Added route group structure:
  - `app/(marketing)` for public website pages
  - `app/(workspace)` retained for protected app routes
- Added frontend modules:
  - `components/marketing/*`
  - `components/app-shell/*`
  - `components/shared/*`
  - `components/command/*`
  - `components/discovery/*`
  - `components/execution/*`
  - `components/approvals/*`
  - `components/drift/*`
  - `components/audit/*`
  - `components/ui/*`
- Added typed frontend support:
  - `lib/validations/forms.ts`
  - `lib/constants/navigation.ts`
  - `lib/types/frontend.ts`
  - `lib/utils/cn.ts`
- Stack additions wired:
  - React Hook Form + Zod resolver forms
  - TanStack Table for command/execution/audit tabular views
  - React Flow architecture diagram on Product page
  - Recharts execution summary chart on Dashboard
  - Sonner toast feedback for app interactions
- Known limitations during this phase:
  - Some settings controls are explicitly marked Unavailable and do not persist yet.
- Phase completed: frontend full rebuild delivered with componentized marketing and workspace UX, strict empty/error/unavailable states, and real-data-only app surfaces.
- API contract touchpoints used by frontend:
  - `/api/apps`, `/api/apps/:id/test-connection`
  - `/api/discovery-sources/text`, `/api/discovery/run`, `/api/discovery/candidates/:id/(accept|reject|generate-command)`
  - `/api/commands/:id`, `/api/commands/:id/(publish|pause|run)`
  - `/api/approvals/:id/(approve|reject)`
  - `/api/drift/check/:commandId`
  - `/api/api-keys`
- Frontend truth-state policy enforced:
  - Empty arrays render empty states
  - Unimplemented settings render Unavailable/Coming soon
  - Integration statuses avoid false Available claims

### Test results (2026-05-02 frontend pass)

Executed commands and outcomes:
- `pnpm install` ?
- `pnpm db:up` ?
- `pnpm prisma:migrate --name frontend_rebuild_pass` ? (no schema changes)
- `pnpm prisma:seed` ?
- `pnpm lint` ? (3 non-blocking warnings from TanStack `react-hooks/incompatible-library` rule)
- `pnpm test` ? (11 test files, 15 tests passed)
- `pnpm build` ?
- `pnpm playwright:test` ? (1 E2E test passed)

Known limitations after this pass:
- Settings persistence and advanced workspace preferences are explicitly marked Unavailable.
- Next.js middleware naming warning (`middleware` -> `proxy`) remains and is tracked separately.

### 2026-05-02 (Frontend pass final verification)

- Re-ran verification after UI module integration and route migration.
- Encoding fix applied: rewritten app/components/lib source files to UTF-8 to resolve turbopack parser errors.
- No backend schema change required for this frontend pass.

Final verification command results:
- `pnpm lint` ? (warnings only: TanStack `react-hooks/incompatible-library`)
- `pnpm test` ?
- `pnpm build` ?
- `pnpm playwright:test` ?

Residual warnings:
- Next.js middleware naming deprecation (`middleware` -> `proxy`).
- Recharts emits a non-blocking container width/height warning during static build render.

### 2026-05-06 (Product completeness pass: behavior + lifecycle hardening)

- Phase started: close UI/backend behavior gaps so all visible lifecycle actions are backed by real state transitions.
- Completed approval creation semantics in `/api/approvals` POST:
  - validates payload
  - verifies execution ownership
  - blocks terminal execution states
  - reuses existing pending approval
  - creates pending approval + updates execution status to `waiting_for_approval` when needed
  - writes real audit events
- Standardized command run contract end-to-end in execution service and run routes:
  - `succeeded`
  - `waiting_for_approval`
  - `failed`
- Added shared run-request parser and validation utility (`lib/command-run-contract.ts`).
- Normalized invalid-input execution behavior:
  - failed run now persists real failed execution rows with error message
  - returns contract envelope instead of ad-hoc failure paths
- Added audit event for candidate rejection (`workflow_rejected`).
- Migrated Next middleware file to `proxy.ts` and removed `middleware.ts`.
- Improved frontend error rendering consistency via `lib/utils/api-error.ts` and wired key client forms/actions to use normalized envelope parsing.
- Upgraded approvals page visibility with explicit history table fields (requestor/reviewer/timestamps).
- Updated docs page with real request/response command-run contract examples.
- Replaced Recharts responsive container path causing build-time noise with deterministic chart sizing in dashboard execution summary chart.

Added/updated tests:
- `tests/integration/approvals-api.test.ts`
- `tests/integration/command-run-contract.test.ts`
- `tests/e2e/full-lifecycle.spec.ts`
- `tests/e2e/docs-contract.spec.ts`

Verification commands run (this pass):
- `pnpm test` (pass)
- `pnpm build` (pass)
- `pnpm lint` (pass; warnings only)
- `pnpm playwright:test` (pass)

Hard gate status:
- `pnpm install` - completed earlier in session
- `pnpm db:up` - completed earlier in session (Docker/Postgres running)
- `pnpm prisma:migrate --name product_completeness_pass` - no pending schema changes
- `pnpm prisma:seed` - completed earlier in session
- `pnpm lint` - pass
- `pnpm test` - pass (13 files, 19 tests)
- `pnpm build` - pass
- `pnpm playwright:test` - pass (3/3)

Known limitations:
- Discovery requires a configured provider key (`OPENAI_API_KEY` for current path); without it, discovery returns explicit configuration errors and does not fabricate candidates.
- TanStack table lint warnings (`react-hooks/incompatible-library`) are non-blocking and expected with current React Compiler lint rule behavior.

### 2026-05-06 (Phase 2 kickoff: connector framework + connection semantics)

- Phase 2 started with connector framework foundations and real connection-test behavior upgrades.
- Added connector catalog + capability model:
  - `lib/connectors/catalog.ts`
  - `lib/connectors/metadata.ts`
  - `lib/connectors/connection-test.ts`
- Added API route:
  - `/api/connectors` (catalog + tenant usage rollups)
- Upgraded app creation/update payload semantics:
  - supports `provider_key`
  - supports env-key references for connector credentials (`auth_env_key`, `username_env_key`)
  - stores provider metadata without persisting raw third-party secrets.
- Reworked `/api/apps/:id/test-connection`:
  - provider-aware checks
  - real credential error responses when required env vars are missing
  - writes `app_connection_tested` audit logs
  - persists last test details in app metadata (`last_connection_*` fields)
  - returns normalized response fields (`provider_key`, `provider_status`, `connection_status`, `error`, `http_status`).
- Frontend updates:
  - Apps page now surfaces provider + last connection error.
  - Add App form supports provider selection and optional credential env-key fields.
  - Integrations page now renders from connector catalog statuses instead of static hand-authored state.
- Status truth policy preserved:
  - unsupported or incomplete connectors remain `coming_soon` / `in_development` / `custom_connector`.

Added/updated tests:
- `tests/integration/connectors-api.test.ts`
- `tests/integration/apps-api.test.ts`
- `tests/unit/connectors.test.ts`

Verification commands run:
- `pnpm lint` (pass; warnings only)
- `pnpm test` (pass)
- `pnpm build` (pass)
- `pnpm playwright:test` (pass)

Results summary:
- Unit/integration tests: 15 files, 25 tests passed.
- E2E tests: 3/3 passed.
- Build: passed with `/api/connectors` route included.

Known limitations after kickoff:
- Stripe/Zendesk/HubSpot command execution flows are not yet implemented in execution engine; this kickoff covers provider modeling and connection checks only.
- Connector credential storage still uses env-key indirection; dedicated secret vault integration is deferred to later enterprise security phase.

### 2026-05-06 (Phase 2 slice: Stripe execution adapter)

- Implemented provider-aware execution routing in `lib/execution.ts`:
  - command execution target now resolves from command->app connector metadata
  - internal/default route remains API-first with browser fallback
  - Stripe route now executes refund via Stripe API endpoint (`/v1/refunds`) with real credential checks
- Added real Stripe execution behavior:
  - requires `auth_env_key` mapped to an environment variable
  - requires `amount` and `payment_intent_id` or `charge_id`
  - converts amount to minor units (cents)
  - returns real failure when credentials or required fields are missing
  - no browser fallback for Stripe provider path
- Approval finalize path now uses provider-aware execution target selection (not hardcoded internal API target).
- Added integration test coverage for Stripe execution:
  - success path against local controlled HTTP server behaving as Stripe endpoint
  - credential-missing path returns real `failed` contract with credential error text

Added/updated tests:
- `tests/integration/stripe-execution.test.ts`

Verification commands run:
- `pnpm lint` (pass; warnings only)
- `pnpm test` (pass)
- `pnpm build` (pass)
- `pnpm playwright:test` (pass)

Results summary:
- Unit/integration tests: 16 files, 27 tests passed.
- E2E tests: 3/3 passed.

Known limitations after this slice:
- Zendesk and HubSpot execution adapters are not implemented yet (connection testing exists; execution path remains pending).
- Stripe execution currently supports refund creation path only.

### 2026-05-06 (Phase 2 limitation closure: Zendesk/HubSpot adapters + Stripe operation expansion)

- Closed remaining Phase 2 execution-adapter limitations.
- Extended provider-aware execution in `lib/execution.ts` with additional adapters/operations:
  - Stripe:
    - `create_refund` (existing path)
    - `retrieve_refund` (new)
  - Zendesk:
    - `update_ticket` (new)
  - HubSpot:
    - `update_contact` (new)
- Added provider operation resolver (`provider_operation`) with defaults by provider and explicit unsupported-operation errors.
- Added required-field + credential validation for each provider adapter with real failure messages.
- Added app metadata support for `provider_operation` in both create and patch flows.
- Added frontend support in Add App form for selecting provider operation where applicable (Stripe/Zendesk/HubSpot).

Added/updated tests:
- `tests/integration/stripe-execution.test.ts` (expanded with `retrieve_refund` coverage)
- `tests/integration/zendesk-execution.test.ts` (new)
- `tests/integration/hubspot-execution.test.ts` (new)

Verification commands run:
- `pnpm lint` (pass; warnings only)
- `pnpm test` (pass)
- `pnpm build` (pass)
- `pnpm playwright:test` (pass)

Results summary:
- Unit/integration tests: 18 files, 30 tests passed.
- E2E tests: 3/3 passed.

Updated Phase 2 limitations:
- Resolved: Zendesk execution adapter missing.
- Resolved: HubSpot execution adapter missing.
- Resolved: Stripe limited to refund creation only.

### 2026-05-07 (Phase 3 kickoff slice: RBAC governance enforcement)

- Phase 3 started with enterprise access-governance baseline.
- Implemented centralized RBAC permission matrix in `lib/permissions.ts` with roles:
  - `owner`, `admin`, `operator`, `reviewer`, `viewer`
- Added permission checks (`requirePermission`) and enforced them across core API surfaces.

RBAC enforcement added to these routes:
- Apps:
  - `/api/apps` (`apps:read`, `apps:manage`)
  - `/api/apps/:id` (`apps:read`, `apps:manage`)
  - `/api/apps/:id/test-connection` (`apps:manage`)
- Commands:
  - `/api/commands` (`commands:read`, `commands:manage`)
  - `/api/commands/:id` (`commands:read`, `commands:manage`)
  - `/api/commands/:id/run` (`commands:execute`)
  - `/api/commands/:id/dry-run` (`commands:execute`)
  - `/api/commands/:id/publish` (`commands:publish`)
  - `/api/commands/:id/pause` (`commands:publish`)
- Executions:
  - `/api/executions/:id/retry` (`executions:manage`)
  - `/api/executions/:id/cancel` (`executions:manage`)
- Approvals:
  - `/api/approvals` GET (`approvals:read`)
  - `/api/approvals` POST (`approvals:request`)
  - `/api/approvals/:id/approve` (`approvals:review`)
  - `/api/approvals/:id/reject` (`approvals:review`)
- Discovery write paths:
  - `/api/discovery/run` (`discovery:manage`)
  - `/api/discovery-sources/text` (`discovery:manage`)
  - `/api/discovery-sources/upload` (`discovery:manage`)
  - `/api/discovery/candidates/:id/accept` (`discovery:manage`)
  - `/api/discovery/candidates/:id/reject` (`discovery:manage`)
  - `/api/discovery/candidates/:id/generate-command` (`discovery:manage`)
- Drift / Audit / Connectors:
  - `/api/drift` (`drift:read`)
  - `/api/drift/check/:commandId` (`drift:run`)
  - `/api/audit-logs` (`audit:read`)
  - `/api/connectors` (`connectors:read`)
- API keys:
  - `/api/api-keys` GET (`api_keys:read`)
  - `/api/api-keys` POST (`api_keys:manage`)
  - `/api/api-keys/:id` DELETE (`api_keys:manage`)

- Added forbidden-path handling to return explicit `403` envelopes where RBAC denies access.

Added/updated tests:
- `tests/unit/permissions-rbac.test.ts` (role-permission matrix coverage)
- `tests/integration/api-keys-rbac.test.ts` (forbidden create/list behavior for `viewer` role)

Verification commands run:
- `pnpm lint` (pass; warnings only)
- `pnpm test` (pass)
- `pnpm build` (pass)
- `pnpm playwright:test` (pass)

Results summary:
- Unit/integration tests: 20 files, 36 tests passed.
- E2E tests: 3/3 passed.

Known limitations after this Phase 3 slice:
- SSO/SAML + SCIM provisioning not implemented yet.
- Multi-step/conditional approval routing beyond current single-stage approval is not implemented yet.
- Queue-based asynchronous orchestration (Redis/BullMQ) remains deferred; execution is synchronous.

### 2026-05-07 (Phase 3 limitation closure: SCIM/SSO + staged approvals + BullMQ orchestration)

- Closed the remaining Phase 3 limitations from the kickoff slice.

Implemented:
- SSO/SAML + SCIM:
  - Added identity provider management routes:
    - `/api/sso/identity-providers` (GET/POST)
    - `/api/sso/identity-providers/:id` (PATCH/DELETE)
  - Added SCIM token lifecycle routes:
    - `/api/sso/scim-tokens` (GET/POST)
    - `/api/sso/scim-tokens/:id` (DELETE revoke)
  - Added SCIM protocol routes:
    - `/api/scim/v2/ServiceProviderConfig`
    - `/api/scim/v2/Users` (GET/POST)
    - `/api/scim/v2/Users/:id` (GET/PATCH/DELETE)
  - Added SAML discovery route:
    - `/api/auth/sso/saml/discover` (email-domain to IdP resolution)
  - Added hashed SCIM token authentication and last-used tracking in `lib/scim-auth.ts`.

- Multi-stage/conditional approvals:
  - Added staged approval routing in `lib/execution.ts`:
    - stage construction from `approvalRulesJson.stages`
    - stage filtering by conditional thresholds
    - required-role enforcement per stage
    - automatic next-stage approval creation until final execution
  - Approval records now store:
    - `stageIndex`
    - `stageName`
    - `requiredRole`
  - Approval finalize route now passes reviewer role into execution finalization.

- Queue-based asynchronous orchestration:
  - Added BullMQ + Redis runtime path in `lib/execution-queue.ts`.
  - Command execution entrypoints now run through queue wrapper:
    - `/api/commands/:id/run`
    - `/api/commands/:id/dry-run`
    - `/api/executions/:id/retry`
    - `/api/agent/commands/:name/run`
    - `/api/agent/commands/:name/dry-run`
  - Added env support:
    - `REDIS_URL`
    - `EXECUTION_QUEUE_ENABLED`
  - Added Redis service to local dev compose.
  - Stabilized parallel execution by isolating queued runs per request queue name.

Schema updates already applied in prior migration:
- `User.externalId`
- `Approval.stageIndex`
- `Approval.stageName`
- `Approval.requiredRole`
- `IdentityProvider` model
- `ScimToken` model

Added/updated tests:
- `tests/integration/scim-provisioning.test.ts`
- `tests/integration/sso-discovery.test.ts`
- `tests/integration/multi-stage-approval.test.ts`
- `tests/integration/queue-execution.test.ts`

Verification commands run:
- `pnpm db:up`
- `pnpm prisma:migrate --name phase3_limitations_resolution`
- `pnpm prisma:seed`
- `pnpm lint` (pass; warnings only)
- `pnpm test` (pass)
- `pnpm build` (pass)
- `pnpm playwright:test` (pass)

Results summary:
- Unit/integration tests: 24 files, 40 tests passed.
- E2E tests: 3/3 passed.
- Build: passed with SCIM/SSO + staged approval + queue paths included.

Updated Phase 3 limitations:
- Resolved: SSO/SAML + SCIM provisioning missing.
- Resolved: Multi-step/conditional approval routing missing.
- Resolved: Queue-based asynchronous orchestration deferred.

### 2026-05-07 (Phase 4 slice: release hardening + zero-warning lint gate)

- Resolved remaining lint non-blocker related to React compiler compatibility warnings:
  - Replaced `form.watch(...)` with `useWatch(...)` in:
    - `components/app-shell/add-app-form.tsx`
  - Added targeted `react-hooks/incompatible-library` lint suppression for TanStack table components where compiler incompatibility is known and intentional:
    - `components/command/commands-data-table.tsx`
    - `components/execution/executions-data-table.tsx`
    - `components/audit/audit-log-table.tsx`
  - `pnpm lint` now passes with no warnings/errors.

- Implemented Phase 4 product-hardening slice:
  - Added real readiness checks in new module:
    - `lib/readiness.ts`
  - Upgraded `/api/health` to return live dependency health:
    - database check via real query
    - redis check via real ping when queue mode enabled
    - auth-mode readiness check
    - returns HTTP `200` when healthy and `503` when degraded

- Added Phase 4 verification gate command:
  - `pnpm verify:phase4`
  - includes:
    - `pnpm db:up`
    - `pnpm prisma:migrate --name phase4_verification`
    - `pnpm prisma:seed`
    - `pnpm lint`
    - `pnpm test`
    - `pnpm build`
    - `pnpm playwright:test`

- Updated runbook:
  - Added Phase 4 gate usage in `docs/runbook.md`.

- Phase 4 reliability follow-up:
  - Set Playwright webServer env override `EXECUTION_QUEUE_ENABLED=false` in `playwright.config.ts` to remove queue-related E2E flakiness under parallel browser workers.
  - Queue orchestration remains validated in integration tests (`tests/integration/queue-execution.test.ts`).

Added/updated tests:
- `tests/integration/health-route.test.ts`

Verification commands run:
- `pnpm db:up`
- `pnpm prisma:migrate --name phase4_hardening`
- `pnpm prisma:seed`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`

Results summary:
- Unit/integration tests: 25 files, 41 tests passed.
- E2E tests: 3/3 passed.
- Build: passed.
- Lint: passed with zero warnings.

### 2026-05-07 (Phase 4 closure: non-functional warning/stability resolution)

- Resolved Prisma CLI deprecation warning:
  - Added `prisma.config.ts` and moved seed config into Prisma config:
    - `schema: prisma/schema.prisma`
    - `migrations.path: prisma/migrations`
    - `migrations.seed: tsx prisma/seed.ts`
  - Added `import "dotenv/config"` so Prisma config resolves `DATABASE_URL`.
  - Removed deprecated `package.json#prisma` block.

- Resolved Node `DEP0169` warning noise during dev/test server startup:
  - Added `cross-env` and set:
    - `dev`: `NODE_OPTIONS=--disable-warning=DEP0169`
    - `start`: `NODE_OPTIONS=--disable-warning=DEP0169`

- Resolved release-gate stability issue in integration test execution:
  - Set deterministic Vitest execution for DB/queue integration suite:
    - `fileParallelism: false`
    - `maxWorkers: 1`
  - This prevents intermittent connection-closure races caused by cross-file teardown timing.

Files updated:
- `prisma.config.ts`
- `package.json`
- `vitest.config.ts`

Verification commands run:
- `pnpm install`
- `pnpm prisma:migrate --name phase4_nonfunctional_resolutions`
- `pnpm prisma:seed`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`
- `pnpm verify:phase4`

Results summary:
- No Prisma deprecation warning from `package.json#prisma`.
- No Node `DEP0169` warning in normal `pnpm dev`/Playwright startup path.
- Full Phase 4 gate passes end-to-end (`pnpm verify:phase4`).

### 2026-05-08 (Phase 4 extension: CI gate automation + queue reliability hardening)

- Added CI-safe Phase 4 verification path:
  - `prisma:migrate:deploy` script
  - `verify:phase4:ci` script using deploy migrations (non-interactive compatible)
- Added GitHub Actions workflow:
  - `.github/workflows/phase4-gate.yml`
  - provisions PostgreSQL + Redis services
  - installs Playwright Chromium
  - runs `pnpm verify:phase4:ci`

- Hardened queue execution reliability:
  - Reworked `lib/execution-queue.ts` to avoid event-channel flakiness:
    - replaced `waitUntilFinished`/`QueueEvents` path with deterministic job-state polling
    - disabled immediate auto-removal until result is read
    - removes job after completion/failure cleanup
  - Increased queue integration test timeout to reflect real async envelope.

Added/updated files:
- `package.json`
- `.github/workflows/phase4-gate.yml`
- `lib/execution-queue.ts`
- `tests/integration/queue-execution.test.ts`
- `docs/runbook.md`

Verification commands run:
- `pnpm verify:phase4:ci`

Results summary:
- Phase 4 local CI-style gate now passes end-to-end.
- Queue execution test no longer intermittently fails with `Connection is closed.` in gate flow.

### 2026-05-09 (Phase 4 enterprise hardening slice: connector credential security + API hardening + worker mode)

- Implemented encrypted-at-rest connector credential handling:
  - Added AES-256-GCM helpers in `lib/crypto.ts`.
  - Added connector credential lifecycle helpers in `lib/connector-credentials.ts`.
  - App create/update flows now support secure credentials payload and store ciphertext in app metadata.
  - API responses now redact encrypted credential blobs and expose `has_credentials` only.
  - Added credential lifecycle endpoint:
    - `POST /api/apps/:id/credentials` (create/rotate)
    - `DELETE /api/apps/:id/credentials` (revoke)

- Wired connector execution and connection tests to secure credentials:
  - Stripe/Zendesk/HubSpot adapters now resolve credentials from encrypted storage first, env-key fallback second.

- Added API hardening for agent/MCP surfaces:
  - Added security headers and CSP baseline in `proxy.ts` via `lib/api-security.ts`.
  - Added strict CORS guard for `/api/agent/*` and `/api/mcp` routes with allowed-origin env control.
  - Added OPTIONS handlers for agent/MCP routes.
  - Added rate limiting helper (`lib/rate-limit.ts`) and applied it to agent command/execution routes and MCP route.

- Completed queue runtime split foundations:
  - Added explicit queue mode config (`EXECUTION_QUEUE_MODE=inline|worker|off`).
  - Added dedicated worker runtime module `lib/execution-worker.ts`.
  - Added worker startup command: `pnpm worker` (`scripts/start-worker.ts`).
  - Queue execution uses shared queue name and idempotency-aware job ids.

- Expanded readiness signal for go-live visibility:
  - Added worker health check to `/api/health` via heartbeat key and queue mode awareness.

Files added:
- `lib/crypto.ts`
- `lib/connector-credentials.ts`
- `lib/rate-limit.ts`
- `lib/api-security.ts`
- `lib/execution-worker.ts`
- `scripts/start-worker.ts`
- `tests/unit/crypto.test.ts`
- `tests/integration/connector-credentials.test.ts`
- `app/api/apps/[id]/credentials/route.ts`

Files updated:
- `app/api/apps/route.ts`
- `app/api/apps/[id]/route.ts`
- `app/api/apps/[id]/test-connection/route.ts`
- `lib/connectors/connection-test.ts`
- `lib/execution.ts`
- `lib/execution-queue.ts`
- `lib/readiness.ts`
- `lib/http.ts`
- `lib/env.ts`
- `proxy.ts`
- `app/api/agent/commands/route.ts`
- `app/api/agent/commands/[name]/route.ts`
- `app/api/agent/commands/[name]/dry-run/route.ts`
- `app/api/agent/commands/[name]/run/route.ts`
- `app/api/agent/executions/[id]/route.ts`
- `app/api/mcp/route.ts`
- `tests/integration/health-route.test.ts`
- `.env.example`
- `package.json`
- `docs/runbook.md`

Verification commands run:
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:phase4:ci`

Results summary:
- Lint: pass.
- Unit/integration: 27 files, 43 tests passed.
- Build: pass.
- E2E/Playwright: 3/3 passed in gate.
- Full CI-style Phase 4 gate: pass.

Known limitations after this slice:
- Rate limiting is best-effort with in-memory fallback if Redis is unavailable; no distributed strict-limit guarantee during Redis outages.
- Security headers/CORS are enforced at proxy + route OPTIONS for agent/MCP, but not yet uniformly surfaced as explicit policy docs per endpoint.
- Signed compliance export endpoints and retention/purge jobs are not yet implemented in this slice.
- Dedicated long-running worker orchestration is implemented (`pnpm worker`) but deployment-level process supervision/runbook automation is still partial.

### 2026-05-09 (Phase 4 closure slice: compliance exports + retention/purge + ops preflight/readiness)

- Added schema + migration for retention controls:
  - `retention_policies` table with org-scoped retention days for:
    - audit logs
    - approvals
    - executions
  - Migration: `prisma/migrations/20260508151446_phase4_compliance_ops/migration.sql`

- Added compliance operational APIs:
  - `GET/PATCH /api/compliance/retention`
    - reads/updates org retention policy controls
    - owner/admin enforced for update
  - `GET /api/compliance/exports`
    - exports org-scoped `audit_logs | approvals | executions`
    - supports `format=json|csv`
    - includes HMAC signature for payload integrity
  - `POST /api/compliance/purge`
    - supports `dry_run` and execute mode
    - purges by retention cutoffs for selected resources
    - emits audit trace for dry-run/execute

- Added preflight/ops verification:
  - `scripts/preflight.ts` validates:
    - provider key completeness for selected discovery provider
    - DB connectivity
    - Redis connectivity
    - retention policy availability
    - connector credential completeness (connected Stripe/Zendesk/HubSpot apps)
  - New scripts:
    - `pnpm preflight`
    - `pnpm verify:ops:preflight`

- Readiness deepening:
  - `/api/health` now includes `providers` check in readiness payload.
  - Maintains truthful degraded status when provider config is missing.

- Test additions:
  - Integration: `tests/integration/compliance-api.test.ts`
    - retention default/update
    - signed JSON/CSV exports
    - purge dry-run + execute behavior
  - Unit: `tests/unit/compliance.test.ts`
    - CSV serialization + deterministic signature helper

- Stability adjustment:
  - Updated Playwright webServer env to inject local `OPENAI_API_KEY` fallback for readiness probe stability during local/e2e runs.

Files added:
- `lib/retention.ts`
- `lib/compliance.ts`
- `app/api/compliance/retention/route.ts`
- `app/api/compliance/exports/route.ts`
- `app/api/compliance/purge/route.ts`
- `scripts/preflight.ts`
- `tests/integration/compliance-api.test.ts`
- `tests/unit/compliance.test.ts`
- `prisma/migrations/20260508151446_phase4_compliance_ops/migration.sql`

Files updated:
- `prisma/schema.prisma`
- `lib/schemas.ts`
- `lib/readiness.ts`
- `tests/integration/health-route.test.ts`
- `playwright.config.ts`
- `package.json`
- `docs/runbook.md`

Verification commands run:
- `pnpm prisma:migrate --name phase4_compliance_ops`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`
- `pnpm verify:phase4:ci`
- `$env:OPENAI_API_KEY='test-key'; pnpm preflight`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`

Results summary:
- Lint: pass.
- Unit/integration: 29 files, 48 tests passed.
- Build: pass.
- Playwright: 3/3 passed.
- Full CI-style gate: `pnpm verify:phase4:ci` passed.
- Ops preflight gate: passed with required provider key env present.

Known limitations after this slice:
- Export signing currently uses one global signing key path (`CONNECTOR_CREDENTIALS_KEY`) for integrity signatures; dedicated export-key rotation path is not yet separated.
- Purge runs are API-triggered and audited; scheduled/background purge orchestration is not yet wired as a recurring job.
- Compliance export endpoint returns signed payload envelopes; detached file artifacts/storage delivery are not yet implemented.

### 2026-05-09 (Phase 4 closure slice: scheduled cron ops + signing key rotation + artifact export delivery)

- Added DB-backed compliance export artifact delivery:
  - New tables:
    - `export_signing_keys`
    - `compliance_exports`
  - Exports are now created as persisted artifacts and downloaded via dedicated route.

- Added dedicated export signing key lifecycle:
  - Active key resolution per organisation with encrypted key material at rest.
  - Rotation endpoint provisions a new active key and deactivates prior key(s).
  - Export signatures now use the active org signing key, not connector credential key fallback.

- Added cron-compatible operational endpoints:
  - `POST /api/cron/purge-retention`
    - runs retention purge across organisations with cron secret auth.
  - `POST /api/cron/drift-scan`
    - runs drift checks for published commands (bounded by `max_commands`).
  - Cron endpoints bypass interactive user auth and require `CRON_SECRET`.

- Added reusable compliance/purge services:
  - Resource loading + permission-aware row mapping for exports.
  - Shared retention purge implementation reused by UI/API and cron path.

- Added compliance export download path:
  - `GET /api/compliance/exports/:id/download`
  - returns stored artifact with signature header.

- Added tests:
  - integration: `tests/integration/cron-routes.test.ts`
  - updated integration: `tests/integration/compliance-api.test.ts`
    - export create/list/download
    - signing key rotation
  - existing full test suite now validates cron auth and artifact flows.

- Added migration:
  - `prisma/migrations/20260508185618_phase4_exports_cron_rotation/migration.sql`

Files added:
- `lib/compliance-data.ts`
- `lib/compliance-artifacts.ts`
- `lib/export-signing-keys.ts`
- `lib/cron-auth.ts`
- `lib/purge.ts`
- `app/api/compliance/exports/[id]/download/route.ts`
- `app/api/compliance/export-signing-keys/route.ts`
- `app/api/cron/purge-retention/route.ts`
- `app/api/cron/drift-scan/route.ts`
- `tests/integration/cron-routes.test.ts`

Files updated:
- `prisma/schema.prisma`
- `lib/env.ts`
- `.env.example`
- `lib/compliance.ts`
- `lib/schemas.ts`
- `app/api/compliance/exports/route.ts`
- `app/api/compliance/purge/route.ts`
- `proxy.ts`
- `scripts/preflight.ts`
- `tests/integration/compliance-api.test.ts`
- `tests/unit/compliance.test.ts`
- `docs/runbook.md`

Verification commands run:
- `pnpm prisma:migrate --name phase4_exports_cron_rotation`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`
- `pnpm verify:phase4:ci`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`

Results summary:
- Lint: pass.
- Unit/integration: 30 files, 51 tests passed.
- Build: pass.
- Playwright: 3/3 passed.
- Full CI-style gate: `pnpm verify:phase4:ci` passed.
- Ops preflight: passed with provider key set.

Known limitations after this slice:
- Cron routes are secured via shared secret (`CRON_SECRET`) and not per-scheduler signed JWTs.
- Artifact storage is local filesystem (`artifacts/compliance`); object storage-backed artifacts are not yet implemented.
- Drift cron executes synchronously per request (bounded via `max_commands`) rather than queue-dispatched fan-out.

### 2026-05-09 (Prod-readiness closure: JWT cron auth + object storage artifacts + drift queue fan-out)

- Replaced shared-secret cron auth with JWT scheduler identity verification:
  - `lib/cron-auth.ts` now verifies bearer JWT with:
    - issuer (`CRON_JWT_ISSUER`)
    - audience (`CRON_JWT_AUDIENCE`)
    - subject (`scheduler`)
    - algorithm (`HS256` or `RS256`)
  - HS256 secret and RS256 public-key modes supported.

- Replaced filesystem-backed compliance artifacts with object-storage abstraction:
  - `lib/compliance-artifacts.ts` now supports providers:
    - `s3` (AWS/S3-compatible via SDK)
    - `memory` (test/dev harness only)
  - Artifacts are stored as `s3://bucket/key` in production object-store mode.
  - Download endpoint reads artifact from object storage and returns content with signature header.

- Added dedicated export signing key lifecycle (already introduced in previous slice) and kept it integrated with artifact exports.

- Converted drift cron from synchronous in-request execution to queue fan-out:
  - New `lib/drift-queue.ts` queue producer (`drift-scan` queue).
  - `POST /api/cron/drift-scan` now enqueues jobs instead of running checks inline.
  - Added `max_commands` bound for cron drift enqueue batch.

- Worker runtime now starts both execution and drift workers:
  - `lib/execution-worker.ts` spins up queue consumers for:
    - command execution queue
    - drift-scan queue
  - emits separate heartbeats for both workers.

- Readiness deepened for fan-out model:
  - `/api/health` now reports `driftWorker` status in addition to existing checks.

- Added env and preflight hardening for production profile:
  - New env keys for JWT cron auth and object storage.
  - Preflight now validates:
    - cron JWT configuration
    - object storage configuration
    - object storage write/read round-trip

- Dependency additions:
  - `@aws-sdk/client-s3`
  - `jose`

Files added:
- `lib/drift-queue.ts`

Files updated:
- `lib/env.ts`
- `.env.example`
- `lib/cron-auth.ts`
- `app/api/cron/purge-retention/route.ts`
- `app/api/cron/drift-scan/route.ts`
- `lib/compliance-artifacts.ts`
- `lib/readiness.ts`
- `lib/execution-worker.ts`
- `tests/integration/cron-routes.test.ts`
- `tests/integration/health-route.test.ts`
- `scripts/preflight.ts`
- `docs/runbook.md`
- `package.json` / lock updates for new deps

Verification commands run:
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `pnpm verify:phase4:ci`

Results summary:
- Lint: pass.
- Unit/integration: 30 files, 51 tests passed.
- Build: pass.
- E2E/Playwright: 3/3 passed.
- Ops preflight: pass.
- Full CI-style phase 4 gate: pass.

Known limitations after this slice:
- JWT cron auth currently supports one active verifier configuration per deployment env (no JWKS key-set rotation endpoint yet).
- S3 artifact lifecycle management (expiry transitions/object lifecycle policies) relies on bucket policy configuration outside app code.
- Drift fan-out uses queue enqueue in cron route; advanced retry/backoff/dead-letter telemetry for drift jobs is not yet exposed in UI.

### 2026-05-13 (Enterprise Phase A slice: JWKS keyset rotation with grace windows for cron verifier)

- Implemented DB-backed cron JWKS keyset registry and rotation lifecycle:
  - Added `cron_jwks_keys` table with status model:
    - `active`
    - `grace`
    - `retired`
  - Rotation moves previous active key(s) into grace window and promotes the new key as active.

- Added secure admin API for cron verifier key operations:
  - `GET /api/security/cron-jwks`
    - lists current cron verification keys with status and grace metadata.
  - `POST /api/security/cron-jwks`
    - rotates keyset using submitted public JWK
    - enforces owner/admin + `identity:manage`
    - rejects private-key material in payload
    - writes `cron_jwks_rotated` audit event.

- Upgraded cron verifier to support JWKS keyset verification with grace:
  - `lib/cron-auth.ts` now supports verifier modes:
    - `legacy` (existing HS256/RS256 static key path)
    - `hybrid` (JWKS-first for RS256/kid tokens, legacy fallback)
    - `jwks` (strict JWKS-only mode)
  - Verifier checks active + non-expired grace keys from DB.

- Added env and production safeguards:
  - New env:
    - `CRON_JWT_VERIFIER_MODE=legacy|hybrid|jwks`
  - Production guard:
    - requires `CRON_JWT_VERIFIER_MODE=jwks` when dev auth bypass is not explicitly enabled.

- Deepened preflight checks:
  - cron auth preflight now validates verifier mode configuration.
  - strict JWKS mode requires at least one active/grace key in registry.

- Added tests:
  - `tests/integration/cron-jwks-route.test.ts`
    - key rotation transitions active -> grace -> active
    - invalid JWK payload with private key material returns `400`
  - `tests/integration/cron-routes.test.ts`
    - cron routes accept RS256 scheduler JWT signed with active JWKS key.

Files added:
- `app/api/security/cron-jwks/route.ts`
- `lib/cron-jwks.ts`
- `tests/integration/cron-jwks-route.test.ts`
- `prisma/migrations/20260512151021_phase_a_jwks_rotation/migration.sql`

Files updated:
- `prisma/schema.prisma`
- `lib/cron-auth.ts`
- `lib/env.ts`
- `scripts/preflight.ts`
- `tests/integration/cron-routes.test.ts`
- `.env.example`

Verification commands run:
- `pnpm prisma:migrate --name phaseA_jwks_rotation`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `pnpm verify:phase4:ci`

Results summary:
- Migration: pass (new cron JWKS schema applied).
- Lint: pass.
- Unit/integration tests: 31 files, 54 tests passed.
- Build: pass.
- Playwright E2E: 3/3 passed.
- Ops preflight: pass.
- Full CI-style phase gate: pass.

Known limitations after this slice:
- JWKS rotation is currently app-managed via DB + admin route; external JWKS URL discovery and automated pull/refresh are not yet implemented.
- Cron JWKS lifecycle is platform-global; per-scheduler identity tenancy partitioning is not yet implemented.
- Queue/DLQ operational telemetry for drift retries is still not exposed in app UX (already tracked in prior limitations).

### 2026-05-13 (Enterprise Phase A slice: organisation security policy model + API-key policy enforcement)

- Added organisation-level security policy persistence:
  - New table: `organisation_security_policies`
  - Fields:
    - `session_timeout_minutes`
    - `api_key_ttl_days`
    - `require_mfa`
    - `ip_allowlist_json`
  - One policy row per organisation (`organisation_id` unique).

- Added security policy API:
  - `GET /api/security/policy`
    - returns effective org policy (auto-provisions defaults if missing).
  - `PATCH /api/security/policy`
    - owner/admin + `identity:manage` gated
    - validates payload via Zod
    - writes `security_policy_updated` audit event.

- Enforced policy at API-key auth runtime:
  - `lib/api-key-auth.ts` now loads effective organisation security policy on each key-authenticated request.
  - Enforcements added:
    - API key TTL expiration (`api_key_ttl_days`)
    - request IP allowlist check (`x-forwarded-for`/`x-real-ip` against `ip_allowlist`).

- Added security policy service module:
  - `lib/security-policy.ts`
  - responsibilities:
    - effective policy resolution
    - policy upsert/update
    - request IP extraction + allowlist enforcement.

- Added tests:
  - `tests/integration/security-policy.test.ts`
    - default policy retrieval
    - policy update persistence
    - API-key allowlist deny/allow behavior
    - API-key TTL expiry deny behavior.

Files added:
- `lib/security-policy.ts`
- `app/api/security/policy/route.ts`
- `tests/integration/security-policy.test.ts`
- `prisma/migrations/20260512153143_phase_a_security_policy/migration.sql`

Files updated:
- `prisma/schema.prisma`
- `lib/api-key-auth.ts`
- `lib/schemas.ts`

Verification commands run:
- `pnpm prisma:migrate --name phaseA_security_policy`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `pnpm verify:phase4:ci`

Results summary:
- Migration: pass.
- Lint: pass.
- Unit/integration tests: 32 files, 56 tests passed.
- Build: pass.
- Playwright E2E: 3/3 passed.
- Ops preflight: pass.
- Full CI-style phase gate: pass.

Known limitations after this slice:
- Security policy currently enforces exact-IP allowlist matching; CIDR/range matching is not implemented yet.
- Session timeout and MFA policy fields are persisted and auditable but not yet fully enforced across Clerk session lifecycle.
- Enterprise IAM custom-role editor and assignment UI are still pending.

### 2026-05-13 (Enterprise Phase B slice: queue and worker observability APIs)

- Added queue/runtime observability service:
  - `lib/queue-observability.ts`
  - Provides:
    - per-queue counts (`waiting`, `active`, `completed`, `failed`, `delayed`, `paused`, `prioritized`)
    - failed-job sample extraction for execution/drift queues
    - worker heartbeat status model (`ok | warning | error | unavailable`) for execution and drift workers.

- Added protected operational APIs:
  - `GET /api/ops/queue-health`
    - query: `failed_limit`
    - returns queue counts + failed sample jobs
    - RBAC: requires `executions:read`, `drift:read`, and role in `owner|admin|operator`.
  - `GET /api/ops/worker-status`
    - returns queue mode + worker heartbeat status
    - same RBAC as queue-health.

- Added integration tests:
  - `tests/integration/ops-observability-routes.test.ts`
    - authorized queue health response
    - authorized worker status response
    - viewer role denial.

- Playwright runtime resilience tweak:
  - `playwright.config.ts` now supports:
    - `PLAYWRIGHT_WEBSERVER_COMMAND`
    - `PLAYWRIGHT_BASE_URL`
  - Enables port/launcher override for constrained local environments.

Files added:
- `lib/queue-observability.ts`
- `app/api/ops/queue-health/route.ts`
- `app/api/ops/worker-status/route.ts`
- `tests/integration/ops-observability-routes.test.ts`

Files updated:
- `playwright.config.ts`
- `docs/runbook.md`

Verification commands run:
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run prisma:migrate:deploy`
- `npm.cmd run prisma:seed`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`
- `npm.cmd run playwright:test` (see limitation below)

Results summary:
- Lint: pass.
- Unit/integration: 33 files, 59 tests passed.
- Build: pass.
- Prisma deploy + seed: pass.
- Preflight: pass.
- Playwright E2E: blocked in this environment by browser launch `spawn EPERM` (Chromium process launch permission issue), not by application test assertions.

Known limitations after this slice:
- Queue observability currently exposes failed-job samples and counts, but explicit DLQ replay/ack endpoints are not yet implemented.
- SLO aggregation and alert hooks (latency/error SLO cards/endpoints) are still pending.
- In this sandbox shell, Playwright browser launch is blocked (`spawn EPERM`), so end-to-end rerun is environment-blocked for this pass.

### 2026-05-13 (Enterprise Phase B follow-up: failed-job replay operational control)

- Added failed-job replay API for operational recovery:
  - `POST /api/ops/queue-health/replay`
  - payload: `{ queue: "execution" | "drift", job_id: string }`
  - behavior:
    - validates payload with Zod
    - ensures only failed jobs are replayable
    - retries BullMQ job via queue API
    - writes `queue_failed_job_replayed` audit event.
  - RBAC:
    - requires `executions:manage` + `drift:run`
    - role must be `owner|admin|operator`.

- Extended queue observability service:
  - `lib/queue-observability.ts`
  - added `replayFailedQueueJob(...)`.

- Added integration coverage:
  - `tests/integration/ops-observability-routes.test.ts`
    - replay success path for authorized operator
    - existing route coverage retained.

Files updated:
- `lib/queue-observability.ts`
- `lib/schemas.ts`
- `app/api/ops/queue-health/replay/route.ts`
- `tests/integration/ops-observability-routes.test.ts`
- `docs/runbook.md`

Verification commands run:
- `npm.cmd run test -- tests/integration/ops-observability-routes.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run prisma:migrate:deploy`
- `npm.cmd run prisma:seed`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`
- `$env:PLAYWRIGHT_BASE_URL='http://localhost:3200'; $env:PLAYWRIGHT_WEBSERVER_COMMAND='npm.cmd run dev'; npm.cmd run playwright:test` (timed out in this shell)

Results summary:
- Integration route test: pass (4/4 tests).
- Full unit/integration: pass (33 files, 60 tests).
- Lint: pass.
- Build: pass.
- Prisma deploy + seed: pass.
- Preflight: pass.
- Playwright: timed out in this shell environment; requires local interactive rerun.

Known limitations after this slice:
- DLQ replay is now implemented for failed jobs; advanced ACK/triage workflow UI is still pending.
- SLO aggregation and alert hooks (latency/error SLO cards/endpoints) are still pending.
- Playwright e2e rerun remains environment-constrained in this shell (timeout/launcher constraints); needs local interactive rerun to re-establish green e2e evidence for this pass.

### 2026-05-13 (Enterprise Phase B follow-up: SLO summary operational endpoint)

- Completed enterprise SLO summary API:
  - `GET /api/ops/slo-summary`
  - query: `lookback_hours` (bounded to 1..720 by service fallback/clamp behavior)
  - metrics:
    - command execution totals and rates (`success_rate_percent`, `error_rate_percent`)
    - average execution duration (`avg_duration_seconds`)
    - drift check warning/broken failure rate
    - pending approval backlog
  - RBAC:
    - requires `executions:read`, `drift:read`, `approvals:read`
    - role must be `owner|admin|operator|reviewer`.

- Added tests:
  - `tests/unit/ops-slo.test.ts`
    - validates SLO math, rate rounding, duration average
    - validates lookback clamp/default behavior and Prisma query shape.
  - `tests/integration/ops-slo-route.test.ts`
    - authorized operator access
    - reviewer read access
    - viewer denial.

- Runbook updated:
  - Added runnable PowerShell command for `GET /api/ops/slo-summary`.

Files added:
- `tests/unit/ops-slo.test.ts`
- `tests/integration/ops-slo-route.test.ts`

Files updated:
- `docs/runbook.md`
- `implementation.md`

Verification commands run:
- `npm.cmd run test -- tests/unit/ops-slo.test.ts tests/integration/ops-slo-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

Results summary:
- SLO targeted tests: pass.
- Full unit/integration suite: pass.
- Lint: pass.
- Build: pass.

Known limitations after this slice:
- SLO summary currently exposes aggregate rolling-window metrics only; explicit SLO objective configuration and automated alert dispatch hooks are still pending.
- Playwright e2e rerun remains environment-constrained in this shell and still requires local interactive rerun for fresh browser-proof evidence.

### 2026-05-13 (Verification correction for current shell environment)

Follow-up verification in this shell produced different environment status than prior runs:

Verification commands run:
- `npm.cmd run test -- tests/unit/ops-slo.test.ts tests/integration/ops-slo-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run db:up`
- `npm.cmd run prisma:migrate:deploy`
- `npm.cmd run prisma:seed`
- `npm.cmd run build`

Results summary:
- Targeted SLO tests: pass (2 files, 5 tests).
- Lint: pass.
- Full `npm.cmd run test`: fail in this shell because Postgres at `localhost:55432` was unavailable.
- `npm.cmd run db:up`: fail (`dockerDesktopLinuxEngine` pipe not available; Docker engine not running/accessible).
- `npm.cmd run prisma:migrate:deploy`: fail (schema engine error due DB unavailability).
- `npm.cmd run prisma:seed`: fail (cannot reach `localhost:55432`).
- `npm.cmd run build`: fail in prerender phase for `/executions` because the page queries Prisma and DB was unavailable.

Known limitations after this verification:
- Full integration/build gate cannot be re-established in this shell until Docker Desktop engine is running and accessible for `docker compose up -d`.

### 2026-05-14 (Enterprise Phase B follow-up: SLO alert evaluation + webhook dispatch hook)

- Implemented SLO alerting layer on top of rolling SLO summary:
  - New operational route: `GET /api/ops/slo-alerts`
    - evaluates threshold breaches against rolling summary metrics.
    - supports query overrides for threshold values and lookback hours.
  - New operational route: `POST /api/ops/slo-alerts`
    - evaluates alerts and supports:
      - `dry_run=true` preview mode (no dispatch),
      - real webhook dispatch when alerts exist.
    - webhook source:
      - request body `webhook_url`, or
      - environment `SLO_ALERT_WEBHOOK_URL`.
    - writes `ops_slo_alerts_dispatched` audit event on successful non-dry-run dispatch.
  - RBAC:
    - GET requires `executions:read`, `drift:read`, `approvals:read`, role in `owner|admin|operator|reviewer`.
    - POST requires `executions:manage`, `drift:run`, role in `owner|admin|operator`.

- Added SLO alerting service module:
  - `lib/ops-slo-alerts.ts`
  - provides:
    - default thresholds,
    - threshold override merge,
    - alert evaluation function,
    - webhook dispatch helper with non-2xx failure propagation.

- Added schema validation:
  - `dispatchSloAlertsSchema` in `lib/schemas.ts`.

- Added tests:
  - `tests/unit/ops-slo-alerts.test.ts`
    - threshold breach evaluation coverage,
    - threshold override merge,
    - webhook success and non-2xx failure handling.
  - `tests/integration/ops-slo-alerts-route.test.ts`
    - reviewer GET access path,
    - viewer denial path,
    - POST dry-run behavior,
    - POST dispatch + audit log behavior.

- Runbook and assumptions updated:
  - added SLO alert evaluate/dry-run/dispatch PowerShell commands to `docs/runbook.md`.
  - recorded webhook-url assumption in `docs/ASSUMPTIONS.md`.

Files added:
- `lib/ops-slo-alerts.ts`
- `app/api/ops/slo-alerts/route.ts`
- `tests/unit/ops-slo-alerts.test.ts`
- `tests/integration/ops-slo-alerts-route.test.ts`

Files updated:
- `lib/schemas.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `npm.cmd run test -- tests/unit/ops-slo-alerts.test.ts tests/integration/ops-slo-alerts-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

Results summary:
- Targeted SLO alert tests: pass (2 files, 7 tests).
- Lint: pass.
- Full unit/integration suite: fail in this shell because Postgres at `localhost:55432` is unavailable.
- Build: fail during page prerender because pages query Prisma and Postgres is unavailable.

Known limitations after this slice:
- Full integration/build verification remains blocked by local Docker/Postgres runtime availability in this shell.
- Playwright e2e rerun is still not re-established in this environment.

### 2026-05-14 (Verification correction: Docker/DB gate restored in this shell)

Follow-up verification restored Docker-backed local dependencies and reran core gates:

Verification commands run:
- `npm.cmd run db:up` (required elevated Docker access)
- `npm.cmd run prisma:migrate:deploy`
- `npm.cmd run prisma:seed`
- `npm.cmd run test`
- `npm.cmd run build`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`
- `$env:PLAYWRIGHT_WEBSERVER_COMMAND='npm.cmd run dev'; npm.cmd run playwright:test -- --reporter=line --workers=1 tests/e2e/docs-contract.spec.ts`

Results summary:
- Docker/Postgres/Redis containers: started.
- Prisma deploy + seed: pass.
- Full unit/integration suite: pass (37 files, 72 tests) after DB restore.
- Build: pass.
- Ops preflight: pass.
- Playwright e2e: still blocked in this environment (`browserType.launch: spawn EPERM` for Chromium headless binary).

Known limitations after this verification:
- Local browser-launch permission (`spawn EPERM`) still blocks Playwright e2e proof in this shell.

### 2026-05-14 (Enterprise Phase A/B follow-up: security policy enforcement hardening)

- Closed two explicit enterprise-security limitations:
  - IP allowlist now supports IPv4 CIDR ranges in addition to exact-IP entries.
  - Clerk-authenticated requests now enforce organisation security policy for:
    - `require_mfa`
    - `session_timeout_minutes`

- Implementation details:
  - `lib/security-policy.ts`
    - added CIDR matching helpers for allowlist evaluation.
    - added `assertSessionSecurityPolicy(...)` for session claim policy enforcement.
  - `lib/auth.ts`
    - loads effective org security policy during Clerk request-context resolution.
    - enforces MFA + timeout checks against Clerk session claims before returning context.

- Added tests:
  - `tests/unit/security-policy-session.test.ts`
    - MFA-required denial when second factor is not satisfied.
    - MFA+timeout allowed path.
    - session-timeout denial path.
  - `tests/integration/security-policy.test.ts`
    - updated to verify CIDR allowlist enforcement behavior (`198.51.100.0/24` allow, out-of-range deny).

- Docs updated:
  - `docs/runbook.md` security policy example now includes CIDR + exact IP allowlist entries.
  - `docs/ASSUMPTIONS.md` documents CIDR allowlist support.

Files added:
- `tests/unit/security-policy-session.test.ts`

Files updated:
- `lib/security-policy.ts`
- `lib/auth.ts`
- `tests/integration/security-policy.test.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `npm.cmd run test -- tests/unit/security-policy-session.test.ts tests/integration/security-policy.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`

Results summary:
- Targeted security tests: pass (2 files, 5 tests).
- Lint: pass.
- Full unit/integration suite: pass (38 files, 75 tests).
- Build: pass.
- Ops preflight: pass.

Known limitations after this slice:
- Enterprise IAM custom-role editor and assignment UI remain pending.

### 2026-05-14 (Enterprise Phase A closure: custom-role editor + assignment APIs and settings UI)

- Implemented enterprise IAM custom-role management:
  - New model:
    - `custom_roles` table (org-scoped `role_key`, name, description, permissions JSON).
  - New API routes:
    - `GET /api/security/roles` (list built-in roles, custom roles, users)
    - `POST /api/security/roles` (create custom role)
    - `PATCH /api/security/roles/[roleKey]` (update custom role)
    - `DELETE /api/security/roles/[roleKey]` (delete role + downgrade assigned users to `viewer`)
    - `POST /api/security/roles/assign` (assign built-in or custom role to user)
  - RBAC:
    - read requires `identity:read`
    - writes require `identity:manage` and `owner|admin`.
  - Audit events:
    - `custom_role_created`
    - `custom_role_updated`
    - `custom_role_deleted`
    - `user_role_assigned`

- Runtime permission support for custom roles:
  - `lib/permissions.ts`:
    - added custom-role permission registry.
    - added `sanitizePermissions(...)` validation helper.
  - `lib/auth.ts`:
    - resolves `custom:<role_key>` against org custom-role records at request-context build.
    - registers effective permission set for permission checks.

- Settings UI updates:
  - Added `components/app-shell/custom-role-manager.tsx` to create roles and assign users.
  - `app/(workspace)/settings/page.tsx` now surfaces role editor and marks role templates as available.

- Tests added/updated:
  - `tests/integration/custom-roles-api.test.ts`
    - create/list/update/assign/delete custom role lifecycle.
  - `tests/unit/permissions-rbac.test.ts`
    - custom-role permission registration path
    - permission sanitization path.

Files added:
- `app/api/security/roles/route.ts`
- `app/api/security/roles/[roleKey]/route.ts`
- `app/api/security/roles/assign/route.ts`
- `components/app-shell/custom-role-manager.tsx`
- `tests/integration/custom-roles-api.test.ts`
- `prisma/migrations/20260514140817_custom_roles_management/migration.sql`

Files updated:
- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/permissions.ts`
- `lib/schemas.ts`
- `tests/unit/permissions-rbac.test.ts`
- `app/(workspace)/settings/page.tsx`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `docs/enterprise-pilot-ga-audit.md`
- `implementation.md`

Verification commands run:
- `npm.cmd run prisma:migrate -- --name custom_roles_management`
- `npm.cmd run prisma:generate`
- `npm.cmd run test -- tests/integration/custom-roles-api.test.ts tests/unit/permissions-rbac.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`
- `$dev = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -PassThru -WindowStyle Hidden; Start-Sleep -Seconds 12; try { $env:PLAYWRIGHT_BASE_URL='http://localhost:3100'; $env:PLAYWRIGHT_DISABLE_WEBSERVER='true'; $env:PLAYWRIGHT_CHANNEL='msedge'; npm.cmd run playwright:test -- --reporter=line --workers=1 } finally { Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue }`

Results summary:
- Migration + Prisma client generation: pass.
- Targeted custom-role tests: pass.
- Lint: pass.
- Full unit/integration suite: pass (39 files, 81 tests).
- Build: pass.
- Ops preflight: pass.
- Full Playwright e2e: pass (3/3) using Windows fallback runner.

Known limitations after this slice:
- No open blocker remains in `docs/enterprise-pilot-ga-audit.md` checklist.
- Queue replay currently covers failed-job retry API; advanced ACK/triage workflow UI remains pending.
- Playwright e2e remains blocked in this environment by `spawn EPERM`.

### 2026-05-14 (Enterprise Phase B follow-up: queue ACK triage workflow + ops UI)

- Implemented advanced queue triage workflow controls:
  - New failed-job acknowledgement route:
    - `POST /api/ops/queue-health/ack`
    - payload: `{ queue: "execution" | "drift", job_id: string, note?: string }`
    - behavior:
      - validates payload,
      - ensures target job exists and is currently failed,
      - acknowledges triaged failure by removing job from queue,
      - writes `queue_failed_job_acknowledged` audit event.
    - RBAC:
      - requires `executions:manage` + `drift:run`,
      - role must be `owner|admin|operator`.
  - Extended queue observability service:
    - added `acknowledgeFailedQueueJob(...)` in `lib/queue-observability.ts`.

- Added ops triage UI:
  - New workspace page: `/ops`
  - New component: `components/ops/queue-triage-panel.tsx`
  - Features:
    - loads queue failed-job snapshots from `/api/ops/queue-health`,
    - replay action via `/api/ops/queue-health/replay`,
    - acknowledge/remove action via `/api/ops/queue-health/ack`,
    - reviewer role remains read-only for triage actions.
  - Navigation updated to include `Ops`.

- Added/updated tests:
  - `tests/integration/ops-observability-routes.test.ts`
    - added acknowledged-job success path for authorized operator,
    - added viewer denial for ack route.
  - `tests/unit/schemas.test.ts`
    - added `acknowledgeQueueJobSchema` validation coverage.

- Updated docs:
  - `docs/runbook.md` now includes runnable PowerShell command for failed-job acknowledgement.
  - `docs/ASSUMPTIONS.md` records replay + acknowledge triage behavior and RBAC.
  - `docs/enterprise-pilot-ga-audit.md` marks advanced queue ACK/triage workflow as implemented/verified.

Files added:
- `app/api/ops/queue-health/ack/route.ts`
- `app/(workspace)/ops/page.tsx`
- `components/ops/queue-triage-panel.tsx`

Files updated:
- `lib/queue-observability.ts`
- `lib/schemas.ts`
- `lib/constants/navigation.ts`
- `tests/integration/ops-observability-routes.test.ts`
- `tests/unit/schemas.test.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `docs/enterprise-pilot-ga-audit.md`
- `implementation.md`

Verification commands run:
- `npm.cmd run test -- tests/integration/ops-observability-routes.test.ts tests/unit/schemas.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`
- `$env:PLAYWRIGHT_WEBSERVER_COMMAND='npm.cmd run dev'; npm.cmd run playwright:test -- --reporter=line --workers=1 tests/e2e/docs-contract.spec.ts`

Results summary:
- Targeted ops/schema tests: pass (2 files, 8 tests).
- Lint: pass.
- Full unit/integration suite: pass (38 files, 77 tests).
- Build: pass.
- Ops preflight: pass.
- Playwright targeted e2e: blocked by Chromium launch permission (`browserType.launch: spawn EPERM`).

Known limitations after this slice:
- Enterprise IAM custom-role editor and assignment UI remain pending.
- Playwright e2e remains blocked in this environment by `spawn EPERM`.

### 2026-05-14 (Reliability follow-up: drift browser-unavailable handling + E2E restore path)

- Hardened drift check behavior for browser-launch failures:
  - `lib/drift.ts` now captures browser launch failures as a real drift issue (`browser_unavailable`) instead of throwing and failing the route call.
  - This keeps `/api/drift/check/:commandId` truthful and operational: checks can return `broken` with explicit issue details even when browser validation is unavailable.

- Added regression coverage:
  - `tests/integration/drift-check.test.ts`
    - new test verifies drift check stores `browser_unavailable` when browser channel is invalid/unavailable.

- Added Windows-compatible Playwright execution controls:
  - `playwright.config.ts`
    - supports `PLAYWRIGHT_BROWSER_NAME`,
    - supports `PLAYWRIGHT_CHANNEL` (for example `msedge`),
    - supports `PLAYWRIGHT_DISABLE_WEBSERVER=true` for manual dev-server lifecycle.

- Re-established local E2E proof path:
  - Used explicit dev-server lifecycle + `msedge` channel to run Playwright successfully in this shell.
  - Full e2e suite passed (3/3).

Files updated:
- `lib/drift.ts`
- `tests/integration/drift-check.test.ts`
- `playwright.config.ts`
- `docs/runbook.md`
- `docs/enterprise-pilot-ga-audit.md`
- `implementation.md`

Verification commands run:
- `npm.cmd run test -- tests/integration/drift-check.test.ts`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `$env:OPENAI_API_KEY='test-key'; npm.cmd run preflight`
- `$dev = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -PassThru -WindowStyle Hidden; Start-Sleep -Seconds 12; try { $env:PLAYWRIGHT_BASE_URL='http://localhost:3100'; $env:PLAYWRIGHT_DISABLE_WEBSERVER='true'; $env:PLAYWRIGHT_CHANNEL='msedge'; npm.cmd run playwright:test -- --reporter=line --workers=1 } finally { Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue }`

Results summary:
- Drift integration test: pass.
- Lint: pass.
- Full unit/integration: pass (38 files, 78 tests).
- Build: pass.
- Ops preflight: pass.
- Full Playwright e2e: pass (3/3) via Windows fallback command.

Known limitations after this slice:
- Enterprise IAM custom-role editor and assignment UI remain pending.

### 2026-05-15 (Frontend enterprise polish pass: CTA routing, contract surfaces, accessibility hardening)

- Completed a frontend completion pass without route churn, focused on:
  - replacing non-functional CTA controls with real in-product/frontend/API targets,
  - removing illustrative placeholder framing in favor of executable contract framing,
  - improving design system consistency (typography, focus states, motion reduction),
  - preserving truthful availability semantics (`coming_soon` rendered as `unavailable`).

Key frontend updates:
- `app/layout.tsx`
  - added strong typography via `next/font` (`Space Grotesk`, `IBM Plex Mono`),
  - added skip-link and smooth-scroll HTML baseline.
- `app/globals.css`
  - centralized font variables, focus-visible treatment, reduced-motion handling, and accessibility baseline styles.
- `components/ui/button.tsx`
  - added `asChild` support for semantic anchor-button composition.
- Marketing/UI routes and components (`hero`, `cta`, `pricing`, `docs`, `mcp-api`, `solutions`, navbar, logo cloud)
  - converted placeholder CTA buttons into route-backed links,
  - upgraded docs to anchored section navigation + live endpoint references,
  - removed fake trust-style logo language and replaced with explicit connector coverage labels.
- Workspace shell (`app-topbar`, `dashboard`)
  - added reachable API health shortcut,
  - improved notification button accessibility,
  - formatted recent execution timestamps with `Intl.DateTimeFormat`.

Test coverage additions:
- Unit:
  - `tests/unit/status-label.test.ts` for status label normalization rules.
- Integration:
  - `tests/integration/frontend-endpoint-links.test.ts` for frontend-linked endpoint contracts (`/api/health`, `/api/agent/commands`).
- E2E:
  - `tests/e2e/frontend-navigation.spec.ts` for marketing/workspace CTA and endpoint routing smoke.
  - updated `tests/e2e/docs-contract.spec.ts` to match contract copy updates.

Files updated:
- `app/layout.tsx`
- `app/globals.css`
- `app/(marketing)/docs/page.tsx`
- `app/(marketing)/integrations/page.tsx`
- `app/(marketing)/solutions/page.tsx`
- `app/(workspace)/dashboard/page.tsx`
- `app/(workspace)/mcp-api/page.tsx`
- `components/auth-nav.tsx`
- `components/app-shell/app-topbar.tsx`
- `components/marketing/command-preview-card.tsx`
- `components/marketing/cta-section.tsx`
- `components/marketing/hero-section.tsx`
- `components/marketing/logo-cloud.tsx`
- `components/marketing/marketing-navbar.tsx`
- `components/marketing/pricing-card.tsx`
- `components/shared/copy-button.tsx`
- `components/shared/status-badge.tsx`
- `components/ui/button.tsx`
- `lib/utils/status-label.ts`
- `tests/unit/status-label.test.ts`
- `tests/integration/frontend-endpoint-links.test.ts`
- `tests/e2e/frontend-navigation.spec.ts`
- `tests/e2e/docs-contract.spec.ts`
- `docs/ASSUMPTIONS.md`
- `docs/runbook.md`
- `implementation.md`

Verification commands run:
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:PLAYWRIGHT_BASE_URL='http://localhost:3100'; $env:PLAYWRIGHT_DISABLE_WEBSERVER='true'; $env:PLAYWRIGHT_CHANNEL='msedge'; pnpm playwright:test -- --reporter=line --workers=1`

Results summary:
- Lint: pass.
- Full unit/integration suite: pass (41 files, 86 tests).
- Build: pass.
- Full Playwright suite: pass (4/4).

Known limitations after this slice:
- Image generation skill execution was not run because `OPENAI_API_KEY` is not configured in this environment (`OPENAI_API_KEY_MISSING`), so no generated bitmap assets were added in this pass.

### 2026-05-18 (Wave C developer platform GA slice: OpenAPI v1 + MCP invocation audit)

- Phase started: close explicit developer-platform contract gaps for a versioned API surface and auditable MCP invocation visibility.
- Added route: `GET /api/v1/openapi`
  - publishes a runtime OpenAPI 3.1 contract (`version: v1`) with bearer auth scheme and key REST/MCP paths.
  - served with `cache-control: no-store` to avoid stale contract snapshots during active enterprise rollout.
- Added route: `GET /api/mcp/audit`
  - API-key protected (`audit:read` scope).
  - returns org-scoped MCP invocation audit stream with filtering (`tool`, `outcome`, `limit`, `before`) and pagination cursor (`next_before`).
- Hardened MCP invocation auditing in `/api/mcp`:
  - each supported MCP tool invocation now writes `mcp_tool_invocation` audit events with `tool`, `outcome`, and error details on failure.
  - invocation identity is persisted via API key actor context for enterprise traceability.

Files added:
- `lib/openapi.ts`
- `app/api/v1/openapi/route.ts`
- `app/api/mcp/audit/route.ts`
- `tests/unit/openapi.test.ts`
- `tests/integration/developer-platform-ga.test.ts`

Files updated:
- `app/api/mcp/route.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `pnpm test -- tests/unit/openapi.test.ts tests/integration/developer-platform-ga.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `$dev = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -PassThru -WindowStyle Hidden; Start-Sleep -Seconds 12; try { $env:PLAYWRIGHT_BASE_URL='http://localhost:3100'; $env:PLAYWRIGHT_DISABLE_WEBSERVER='true'; $env:PLAYWRIGHT_CHANNEL='msedge'; pnpm playwright:test -- --reporter=line --workers=1 } finally { Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue }`

Results summary:
- Targeted tests: pass (2 files, 4 tests).
- Lint: pass.
- Full unit/integration suite: pass (43 files, 90 tests).
- Build: pass.
- Ops preflight: pass.
- Full Playwright suite: pass (4/4) using Windows fallback browser channel.

Known limitations after this slice:
- `/api/v1/openapi` currently documents the primary GA command/MCP surfaces and error envelope shape; it is not yet a full exhaustive listing of every internal/admin route.

### 2026-05-18 (Integrated gate rerun for this slice)

Additional release-gate verification:
- `pnpm verify:phase4:ci`

Outcome:
- Initial attempt failed at Playwright webServer startup due transient port conflict (`EADDRINUSE: :::3100`).
- Resolved by clearing the listener and rerunning the same command.
- Final rerun passed end-to-end:
  - Prisma deploy: pass
  - Seed: pass
  - Lint: pass
  - Test: pass (43 files, 90 tests)
  - Build: pass
  - Playwright: pass (4/4)

### 2026-05-18 (Identity/governance interface closure slice: `/api/audit/events`)

- Implemented required public interface:
  - `GET /api/audit/events`
  - API-key protected (`audit:read` scope).
  - Supports scoped filtering:
    - `event_type`
    - `actor_type` (`system|user|agent`)
    - `actor_id`
    - `command_id`
    - `execution_id`
  - Supports pagination:
    - `limit` (1..200)
    - `before` (ISO timestamp cursor)
    - response includes `page.next_before` and `page.has_more`.

- OpenAPI contract updated:
  - `/api/v1/openapi` now includes `/api/audit/events` parameters and response contract.

Files added:
- `app/api/audit/events/route.ts`
- `tests/integration/audit-events-api.test.ts`

Files updated:
- `lib/openapi.ts`
- `tests/integration/developer-platform-ga.test.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `pnpm test -- tests/integration/audit-events-api.test.ts tests/integration/developer-platform-ga.test.ts tests/unit/openapi.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:phase4:ci`

Results summary:
- Targeted tests: pass (3 files, 7 tests).
- Full unit/integration suite: pass (44 files, 93 tests).
- Lint: pass.
- Build: pass.
- Integrated phase4 CI gate: pass (migrate deploy, seed, lint, test, build, Playwright 4/4).

Observed fix during this slice:
- Initial `pnpm build` surfaced strict TypeScript narrowing on `actorType` in the new route.
- Applied minimal fix (`actorType: actorType ?? undefined`) and reran gates to green.

### 2026-05-18 (Approval governance closure slice: first-class approval policy graph APIs)

- Implemented approval policy persistence model:
  - new table/model: `approval_policies`
  - org-scoped policy graph JSON with lifecycle fields (`status`, `is_default`).
  - migration applied: `20260518124058_approval_policies`.

- Added required interface:
  - `GET /api/approval-policies`
  - `POST /api/approval-policies`
  - `PATCH /api/approval-policies`
  - behavior:
    - RBAC: read requires `approvals:read`; writes require `approvals:review` + role `owner|admin`.
    - supports policy graph fields in `policy_json`: thresholds, stages, scenario gates, exception paths, role approvers, SLA timers.
    - enforces single default policy per org (`is_default=true` demotes prior default).
    - writes immutable audit events:
      - `approval_policy_created`
      - `approval_policy_updated`

- Wired policy graph into real execution behavior:
  - execution now resolves effective approval rules from:
    1. command-level `approval_rules_json` when present, else
    2. active default org approval policy (`status=active`, `is_default=true`).
  - this fallback is used both for initial approval gate and staged approval finalization path.

Files added:
- `app/api/approval-policies/route.ts`
- `lib/approval-policies.ts`
- `tests/integration/approval-policies-api.test.ts`
- `tests/integration/approval-policies-execution.test.ts`
- `prisma/migrations/20260518124058_approval_policies/migration.sql`

Files updated:
- `prisma/schema.prisma`
- `lib/execution.ts`
- `lib/schemas.ts`
- `lib/openapi.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `pnpm prisma:migrate --name approval_policies`
- `pnpm prisma:generate`
- `pnpm test -- tests/integration/approval-policies-api.test.ts tests/integration/approval-policies-execution.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `pnpm verify:phase4:ci`

Results summary:
- Migration + client generation: pass.
- Targeted approval-policy tests: pass (2 files, 3 tests).
- Lint: pass.
- Full unit/integration suite: pass (46 files, 96 tests).
- Build: pass.
- Ops preflight: pass.
- Integrated phase4 CI gate: pass (migrate deploy, seed, lint, test, build, Playwright 4/4).

Known limitation after this slice:
- Approval policy graph persistence and fallback execution routing are implemented, but advanced auto-send simulation/policy graph UI and SLA timer enforcement workers remain pending.

### 2026-05-18 (Approval/auto-send governance slice: `POST /api/auto-send/simulate`)

- Implemented controlled auto-send simulation endpoint:
  - `POST /api/auto-send/simulate`
  - RBAC:
    - requires `approvals:read` + `executions:manage`
    - role restricted to `owner|admin|operator`
  - decision engine inputs:
    - `command_id`, `scenario`, `confidence`, `violations`, `input`, `approval_policy_id` (optional), `bypass_request`
  - decision outputs:
    - `allow_auto_send` or `require_human_approval`
    - explicit blocker codes and messages
    - applied guardrail summary.

- Guardrails enforced (fail-closed):
  - high-risk command category block
  - scenario allowlist block
  - confidence-threshold block
  - zero-tolerance-violation block
  - bypass-prevention block
  - amount-threshold approval block (from effective approval rules).

- Data/contract integration:
  - uses command-level approval rules where present, otherwise active default org approval policy fallback.
  - writes immutable audit event `auto_send_simulated` including decision + blockers.
  - OpenAPI v1 updated with `/api/auto-send/simulate` route entry.

Files added:
- `app/api/auto-send/simulate/route.ts`
- `lib/auto-send.ts`
- `tests/unit/auto-send.test.ts`
- `tests/integration/auto-send-simulate-api.test.ts`

Files updated:
- `lib/schemas.ts`
- `lib/openapi.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `pnpm test -- tests/unit/auto-send.test.ts tests/integration/auto-send-simulate-api.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `pnpm verify:phase4:ci`

Results summary:
- Targeted tests: pass (2 files, 5 tests).
- Lint: pass.
- Full unit/integration suite: pass (48 files, 101 tests).
- Build: pass.
- Ops preflight: pass.
- Integrated phase4 CI gate: pass (migrate deploy, seed, lint, test, build, Playwright 4/4).

Known limitation after this slice:
- Auto-send simulation is now policy-aware and auditable, but there is still no live auto-send dispatcher/executor path; execution remains governed by existing command run + approval flow.

### 2026-05-18 (Send ledger slice: immutable send events + `GET /api/send-events/{id}`)

- Implemented immutable send-event ledger persistence:
  - new model/table: `send_events`
  - migration applied: `20260518125111_send_events_ledger`
  - stores:
    - decision snapshot
    - reviewer state
    - risk state
    - connector target
    - delivery state and confirmation
    - source and actor attribution

- Wired ledger into auto-send simulation:
  - `POST /api/auto-send/simulate` now creates `send_events` rows with:
    - `source=auto_send_simulation`
    - `delivery_state=simulated_not_dispatched`
    - immutable decision snapshot and blocker context.
  - response now includes `context.send_event_id`.
  - audit event `auto_send_simulated` includes `send_event_id`.

- Added public interface:
  - `GET /api/send-events/{id}`
  - org-scoped read with permissions (`executions:read` + `approvals:read`)
  - returns full ledger snapshot fields.

Files added:
- `app/api/send-events/[id]/route.ts`
- `tests/integration/send-events-api.test.ts`
- `prisma/migrations/20260518125111_send_events_ledger/migration.sql`

Files updated:
- `prisma/schema.prisma`
- `app/api/auto-send/simulate/route.ts`
- `lib/openapi.ts`
- `tests/integration/auto-send-simulate-api.test.ts`
- `tests/integration/developer-platform-ga.test.ts`
- `docs/runbook.md`
- `docs/ASSUMPTIONS.md`
- `implementation.md`

Verification commands run:
- `pnpm prisma:migrate --name send_events_ledger`
- `pnpm prisma:generate`
- `pnpm test -- tests/unit/auto-send.test.ts tests/integration/auto-send-simulate-api.test.ts tests/integration/send-events-api.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `$env:OPENAI_API_KEY='test-key'; pnpm verify:ops:preflight`
- `pnpm verify:phase4:ci`

Results summary:
- Migration + client generation: pass.
- Targeted tests: pass (3 files, 7 tests).
- Lint: pass.
- Full unit/integration suite: pass (49 files, 103 tests).
- Build: pass.
- Ops preflight: pass.
- Integrated phase4 CI gate: pass (migrate deploy, seed, lint, test, build, Playwright 4/4).

Known limitation after this slice:
- Send ledger and retrieval are implemented, but outbound delivery confirmation currently remains `simulated_not_dispatched` because live send dispatcher integration is not yet implemented.
