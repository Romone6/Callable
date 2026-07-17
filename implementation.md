# Callable implementation tracker

Last updated: 2026-07-17

## Open-source core and customer-value delivery

| Phase | Status | Result |
| --- | --- | --- |
| Preserve baseline and choose public scope | Complete | Original implementation preserved at git commit `e9f16d1`; active branch is `open-source-core`. |
| Make the product truthful | Complete | Candidate generation is review-first; it no longer invents Acme routes, browser steps, or refund-specific success rules. Publishing requires an explicit reviewed API step and HTTP method. |
| Simplify runtime and schema | Complete, pending migration application | Removed Clerk/SSO/SCIM, Redis workers, browser fallback, broad third-party connector claims, compliance/cron/SLO/auto-send surfaces and their schema models. Added destructive migration `20260715000000_open_source_core`. |
| Secure console access | Complete in code, deployment verification pending | Production now requires `AUTH_MODE=trusted_proxy` and a 32+ character proxy secret. The proxy injects org/email identity after authentication; Callable resolves an existing persisted user and database role only. |
| Support-operations connector | Complete in code, live credential verification pending | Zendesk ticket updates are the single external adapter. Its app metadata stores only environment-variable names; connection testing calls Zendesk's live `/api/v2/users/me.json`. |
| Correct execution and drift routing | Complete in code | Execution uses the persisted target app base URL, reviewed HTTP method, and encoded route parameters. Acme and Zendesk are the only real execution providers. Drift checks use the persisted target, not the console base URL. |
| Command versions and failure guard | Complete in code, pending migration application | Added append-only publish snapshots and an automatic pause after three consecutive real failures. Dry runs are persisted separately and never count toward the guard. |
| Guided operator UX and agent handoff | Complete in code | The command editor now uses route/method/threshold controls while retaining JSON only for arbitrary schemas. MCP shows an example from an actual published command or explicitly shows that none exists. |
| Test and release gate | Verified remotely | GitHub Actions passed `verify:ci` on a fresh PostgreSQL service: Prisma generation, all migrations, seed, lint, 65 unit/integration tests, production build, and the three current browser tests. Docker's local engine remains unavailable, so an equivalent local `pnpm verify` result is not claimed. |
| Open-source publication readiness | Ready, with tracked limitations | Public repository `Romone6/Callable` is configured with Issues, Discussions, private vulnerability reporting, secret scanning, push protection, Dependabot, a passing remote gate, and protected `main` branch. Live Zendesk sandbox proof remains explicitly pending because no sandbox credentials are configured. |

## Current core flow

1. Seed or create a persisted workspace and register Acme or Zendesk.
2. Store real workflow evidence and run a configured discovery provider.
3. Review and accept a candidate; generate a command draft.
4. Enter a reviewed API route, method, schemas, and approval threshold; publishing records an immutable version.
5. An agent calls through dashboard, REST, or MCP. Execution targets the command's registered app and records the actual response or failure.
6. High-value Acme actions can wait for persisted approval. Three consecutive real failures pause a published command.
7. Run route-level drift checks against the registered app and inspect executions, versions, and audits.

## Known limitations

- A trusted proxy is a deployment requirement for production console access. Callable does not host login, provision users, or accept client-provided roles.
- Zendesk is restricted to ticket updates using `PUT /api/v2/tickets/{ticket_id}.json`; OAuth, browser automation, and a generic connector framework are intentionally absent.
- Drift validates route reachability, not semantic response contracts.
- Discovery requires an OpenAI, Anthropic, or OpenRouter API key. Missing configuration is an unavailable capability, not a fallback result.
- The in-process limiter is suitable for one instance only; use a gateway for distributed deployments.
- The destructive pivot migration and new additive migration have not been applied or integration-verified locally because Docker Desktop cannot start its Linux engine: WSL2 reports that the Virtual Machine Platform feature and BIOS virtualization must be enabled.

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
- 2026-07-17: public repository `Romone6/Callable` is configured with Issues, Discussions, GitHub private vulnerability reporting, secret scanning, push protection, topics, and the `main` default branch.
- 2026-07-17: corrected `verify` and `verify:ci` to generate the Prisma client before migrations after the initial remote CI run failed to load `.prisma/client/default` on a clean checkout. `pnpm prisma:generate`, 44 unit tests, lint, TypeScript, and the production build passed locally after the correction.
- 2026-07-17: the next remote run generated Prisma, applied all 12 migrations, seeded the fresh Postgres service, and passed lint before exposing three stale integration assertions for removed Stripe, Redis/worker, and send-event surfaces. Those tests now assert the supported Zendesk, Postgres readiness, and current OpenAPI contracts; the remote re-run is pending.
- 2026-07-17: the subsequent remote run passed all 29 unit and integration test files (65 tests) and the production build on a fresh Postgres service. It then exposed stale browser tests for a removed `/docs` marketing page, obsolete homepage copy, and a command fixture without a registered target app. The stale docs test is removed; the remaining browser tests now use the live home/dashboard UI and a uniquely registered Acme target. The remote re-run is pending.
- 2026-07-17: the browser re-run passed the controlled-target execution flow and full lifecycle. The remaining homepage test found two real `Open local workspace` links (header and primary CTA); its selector now deliberately chooses the first visible link. The final remote re-run is pending.
- 2026-07-17: GitHub Actions run `29556399329` passed `verify:ci` for commit `819ad0b`: all migrations and seed on fresh PostgreSQL, 65 unit/integration tests, production build, and all three current browser tests. GitHub Actions run `29556569127` then passed the same gate for the verification record commit; `main` now requires the strict `verify` check, enforces it for administrators, requires linear history and resolved conversations, and prohibits force-pushes and deletions.
- 2026-07-17: patched public dependencies to Next `16.2.6`, Prisma `6.19.3`, Vitest `4.1.10`, and Vite `8.0.16`; GitHub Dependabot will be rechecked after the corrected commit reaches `main`.
- 2026-07-17: Docker Desktop was launched twice but its backend did not make an engine available (`//./pipe/dockerDesktopLinuxEngine` is missing). `wsl.exe --status` identifies the cause: the Virtual Machine Platform feature and BIOS virtualization must be enabled. A fresh-database `pnpm verify` run and live Zendesk sandbox test are therefore not claimed. Zendesk retains its pending-live-verification wording.
- 2026-07-17: rebrand completed: product, package, protocol headers, default Postgres identifiers, documentation, tests, and GitHub repository are renamed from VerblLayer to Callable. Existing trusted-proxy deployments must send `x-callable-*` headers. New local environments use the Callable Postgres connection string; upgraded local environments retain their existing connection string and data volume until deliberately migrated. Locked install, Prisma generation, 44 unit tests, lint, TypeScript, and production build passed locally; protected-branch CI remains the database-backed proof.
