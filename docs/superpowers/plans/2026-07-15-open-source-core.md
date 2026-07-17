# Open-source Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution task-by-task with tests before production changes.

**Goal:** Convert Callable into a contributor-ready, self-hosted command runtime with an honest real execution path.

**Architecture:** Retain the existing Next.js, Prisma, MCP, REST, approval, audit, drift, and Acme target paths. Remove enterprise-only routes and dependencies. Reuse persisted `CommandStep` rows as the explicit execution contract instead of generating hardcoded Acme steps.

**Tech Stack:** TypeScript, Next.js, Prisma/Postgres, Zod, Playwright, Vitest, pnpm.

## Global Constraints

- No production mocks or fabricated workflow/execution success.
- Every mutating resource lookup is scoped to `organisationId`.
- No new runtime dependencies.
- Default runtime has no Redis, worker, hosted identity, object-storage, or enterprise IAM requirement.
- Preserve the initial baseline commit `e9f16d1` before removals.

### Task 1: Public repository baseline

**Files:** `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `.gitignore`, `implementation.md`

- [ ] Replace framework boilerplate with installation, scope, safety, and verification documentation.
- [ ] Add MIT licensing and concise contribution/security policy documents.
- [ ] Ignore generated logs, artifacts, and test output.

### Task 2: Core-only dependency and route cut

**Files:** `package.json`, `app/`, `components/`, `lib/`, `tests/`, `prisma/schema.prisma`, `prisma/migrations/`

- [ ] Remove enterprise-only routes, pages, UI components, libraries, migrations, and dependencies.
- [ ] Retain only the command lifecycle, Acme target, REST/MCP, API keys, approval, audit, and drift surfaces.
- [ ] Regenerate Prisma client and lockfile after the schema/dependency cut.

### Task 3: Honest command contract

**Files:** `lib/command-generator.ts`, `app/api/discovery/candidates/[id]/generate-command/route.ts`, `app/api/commands/[id]/publish/route.ts`, `lib/execution.ts`, related tests

- [ ] Require accepted candidates before generation.
- [ ] Create commands with explicit, reviewed steps only; do not infer Acme refund steps from arbitrary evidence.
- [ ] Reject publishing and execution when no executable API step exists.
- [ ] Keep the Acme refund command as a clearly labelled sample created by the seed or direct command API.

### Task 4: Tenant and production safety

**Files:** `lib/env.ts`, `lib/auth.ts`, `lib/execution.ts`, approval routes, drift code, internal Acme route, related tests

- [ ] Scope approval finalization, rejection, and drift checks by organisation.
- [ ] Resolve Acme organisation identity server-side from the command execution.
- [ ] Make production configuration reject development authentication and default secrets.

### Task 5: Real proof and CI

**Files:** `tests/`, `playwright.config.ts`, `.github/workflows/phase4-gate.yml`, `docker-compose.yml`, `docs/runbook.md`

- [ ] Remove fabricated E2E discovery fallback and fake test API keys.
- [ ] Keep discovery-unavailable coverage distinct from persisted lifecycle coverage.
- [ ] Make CI use Postgres and run migration, seed, lint, tests, build, and E2E against the supported core.

### Task 6: Capability record

**Files:** `docs/CAPABILITIES.md`, `docs/OPEN_SOURCE_PIVOT_AUDIT.md`, `implementation.md`

- [ ] Record the shipped capabilities, strengths, constraints, deleted scope, and expansion triggers.
- [ ] Update the build tracker with every completed phase and verified result.
