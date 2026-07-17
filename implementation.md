# VerblLayer implementation tracker

Last updated: 2026-07-16

## Open-source core and customer-value delivery

| Phase | Status | Result |
| --- | --- | --- |
| Preserve baseline and choose public scope | Complete | Original implementation preserved at git commit `e9f16d1`; active branch is `open-source-core`. |
| Make the product truthful | Complete | Candidate generation is review-first; it no longer invents Acme routes, browser steps, or refund-specific success rules. Publishing requires an explicit reviewed API step and HTTP method. |
| Simplify runtime and schema | Complete, pending migration application | Removed Clerk/SSO/SCIM, Redis workers, browser fallback, broad third-party connector claims, compliance/cron/SLO/auto-send surfaces and their schema models. Added destructive migration `20260715000000_open_source_core`. |
| Secure console access | Complete in code, deployment verification pending | Production now requires `AUTH_MODE=trusted_proxy` and a 32+ character proxy secret. The proxy injects org/email identity after authentication; VerblLayer resolves an existing persisted user and database role only. |
| Support-operations connector | Complete in code, live credential verification pending | Zendesk ticket updates are the single external adapter. Its app metadata stores only environment-variable names; connection testing calls Zendesk's live `/api/v2/users/me.json`. |
| Correct execution and drift routing | Complete in code | Execution uses the persisted target app base URL, reviewed HTTP method, and encoded route parameters. Acme and Zendesk are the only real execution providers. Drift checks use the persisted target, not the console base URL. |
| Command versions and failure guard | Complete in code, pending migration application | Added append-only publish snapshots and an automatic pause after three consecutive real failures. Dry runs are persisted separately and never count toward the guard. |
| Guided operator UX and agent handoff | Complete in code | The command editor now uses route/method/threshold controls while retaining JSON only for arbitrary schemas. MCP shows an example from an actual published command or explicitly shows that none exists. |
| Test and release gate | Partially verified | Unit tests, lint, TypeScript, Prisma client generation, and production build pass. Docker Desktop is stopped, so migration deployment, database integrations, live connector proof, the full `verify` gate, and Playwright remain unavailable. |
| Open-source publication readiness | Locally complete, externally blocked | Replaced the stale Redis/Phase 4 workflow with a Postgres-only `verify:ci` gate, added community/release files, Dependabot, and a contributor-first README. Public GitHub repository creation, remote CI proof, branch protection, and private security contact configuration require repository-owner action. |

## Current core flow

1. Seed or create a persisted workspace and register Acme or Zendesk.
2. Store real workflow evidence and run a configured discovery provider.
3. Review and accept a candidate; generate a command draft.
4. Enter a reviewed API route, method, schemas, and approval threshold; publishing records an immutable version.
5. An agent calls through dashboard, REST, or MCP. Execution targets the command's registered app and records the actual response or failure.
6. High-value Acme actions can wait for persisted approval. Three consecutive real failures pause a published command.
7. Run route-level drift checks against the registered app and inspect executions, versions, and audits.

## Known limitations

- A trusted proxy is a deployment requirement for production console access. VerblLayer does not host login, provision users, or accept client-provided roles.
- Zendesk is restricted to ticket updates using `PUT /api/v2/tickets/{ticket_id}.json`; OAuth, browser automation, and a generic connector framework are intentionally absent.
- Drift validates route reachability, not semantic response contracts.
- Discovery requires an OpenAI, Anthropic, or OpenRouter API key. Missing configuration is an unavailable capability, not a fallback result.
- The in-process limiter is suitable for one instance only; use a gateway for distributed deployments.
- The destructive pivot migration and new additive migration have not been applied or integration-verified because Docker virtualization is unavailable on this machine.

## Verification record

- 2026-07-15: `pnpm install --lockfile-only`, `pnpm prisma:generate`, `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, and 19 unit tests passed before the customer-value work.
- 2026-07-16: TDD RED/GREEN evidence recorded for trusted proxy identity, Zendesk metadata/payloads, execution routing, drift probe routing, repeated-failure pausing, command snapshots, publish-step validation, and guided editor patch construction.
- 2026-07-16: focused unit suites passed: 5 files, 13 tests (`command-status`, `command-version`, `command-editor`, `execution-routing`, `execution-safety`).
- 2026-07-16: focused auth/Zendesk/connector suites passed: 3 files, 17 tests.
- 2026-07-16: full unit suite passed: 14 files, 42 tests. `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `pnpm prisma:generate`, and `npm.cmd run build` passed.
- 2026-07-16: `docker desktop status` reported `Status=stopped`; `pnpm prisma:migrate:deploy` reached the configured local database then failed with Prisma schema-engine error. No migration deployment, database integration, live Zendesk credential test, full `verify`, or Playwright result is claimed.
- 2026-07-16: publication-readiness static CI test passed; it prevents the legacy Redis/`verify:phase4:ci` workflow from returning and requires a Postgres-only `verify:ci` command plus Dependabot configuration.
- 2026-07-16: full unit suite passed: 15 files, 44 tests. `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `pnpm prisma:generate`, and `npm.cmd run build` passed after publication-document changes.
- 2026-07-16: `pnpm audit --prod` returned HTTP 410 from pnpm's retired audit endpoint and `npm.cmd audit --omit=dev` returned `ENOLOCK` because this pnpm workspace has no npm lockfile. Neither is treated as a vulnerability result; weekly GitHub Dependabot monitoring is configured for the future public remote.
- 2026-07-16: Docker Desktop still reports `Status=stopped`, so `pnpm verify`, migration deployment, integration tests, Playwright, and live Zendesk sandbox proof remain unverified.
- 2026-07-17: public repository `Romone6/VerblLayer` created. Issues, Discussions, GitHub private vulnerability reporting, secret scanning, push protection, topics, and the `main` default branch are configured; remote CI and branch-protection proof remain in progress.
