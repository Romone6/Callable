# Customer-value core implementation plan

> **For Codex:** Execute this plan in order. Preserve the controlled Acme target while adding the smallest real external path: Zendesk ticket updates.

**Goal:** Make the open-source core deployable behind a trusted identity proxy and materially useful for support operations, with real per-app execution, an explicit Zendesk connector, guided publishing, immutable publish snapshots, and automatic safety pausing after repeated real failures.

**Architecture:** Authentication remains deliberately small: a deployment-owned proxy authenticates the person and injects signed-by-secret identity headers, while Callable resolves an existing database user and role. App configuration stores only public metadata and environment-variable names. The executor selects the command's persisted app and API step, dispatches directly to either the controlled Acme target or the narrow Zendesk ticket-update adapter, then records real outcomes. Publishing creates a command-version snapshot; three consecutive non-dry-run failures pause a published command.

**Tech stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Zod, Vitest, React Hook Form.

## Constraints

- Never store external credentials in the database or browser.
- Never fabricate connection, execution, discovery, audit, or drift results.
- Keep browser automation, OAuth, connector registries, queues, and a generic release workflow out of scope.
- Keep `DEV_AUTH_ENABLED` restricted to non-production development and test use.
- Test every new pure behavioral branch before implementing it. Database-dependent verification remains blocked until Docker virtualization is available.

## Task 1: Add trusted-proxy console authentication

**Files:**
- Modify: `lib/env.ts`
- Modify: `lib/auth.ts`
- Create: `tests/unit/auth.test.ts`
- Modify: `README.md`
- Modify: `docs/runbook.md`
- Modify: `implementation.md`

1. Write failing unit tests for parsing and validating proxy identity headers: require org, email, and a timing-safe shared-secret match; reject malformed/missing headers.
2. Run `npm.cmd run test -- tests/unit/auth.test.ts --reporter=verbose` and confirm the tests fail because the helper does not exist.
3. Add `AUTH_MODE` and `TRUSTED_AUTH_PROXY_SECRET` validation in `lib/env.ts`. Production must require `AUTH_MODE=trusted_proxy`, a 32+ character proxy secret, and must reject `DEV_AUTH_ENABLED` outside build-time validation.
4. Add a pure `validateTrustedProxyIdentity(headers, secret)` helper in `lib/auth.ts`, using `crypto.timingSafeEqual` for the secret. Resolve the identified user by the injected organization slug and email; do not create users or trust a role header.
5. Retain current developer auth only for `NODE_ENV !== production && DEV_AUTH_ENABLED=true`.
6. Re-run the focused unit test and then `npm.cmd run lint`.
7. Document the non-negotiable reverse-proxy contract: strip inbound `x-callable-*` headers, authenticate upstream, then inject `x-callable-auth-secret`, `x-callable-org`, and `x-callable-email`.

## Task 2: Register and test the narrow real Zendesk connector

**Files:**
- Modify: `lib/schemas.ts`
- Modify: `app/api/apps/route.ts`
- Modify: `app/api/apps/[id]/test/route.ts`
- Modify: `components/app-shell/add-app-form.tsx`
- Create: `tests/unit/zendesk.test.ts`
- Modify: `docs/CAPABILITIES.md`
- Modify: `implementation.md`

1. Write failing unit tests for valid server-only environment-variable names and Zendesk ticket-update payload creation. Reject `NEXT_PUBLIC_*`, invalid identifiers, and requests with no ticket mutation.
2. Run `npm.cmd run test -- tests/unit/zendesk.test.ts --reporter=verbose` and confirm RED.
3. Extend app registration validation with the `zendesk` provider metadata shape: `provider_key`, `auth_env_key`, and `username_env_key`. Store only those names in `App.metadataJson`.
4. Add a compact Zendesk option to the app form, including base URL and the two environment variable names. Do not add credential fields.
5. Implement a live connection probe for Zendesk as `GET /api/v2/users/me.json` with server-side Basic auth. Return the real remote error or a truthful “credential environment variable is unavailable” error. Keep Acme's health endpoint probe as-is.
6. Re-run the focused unit test and `npm.cmd run lint`.

## Task 3: Execute against the persisted app, route, and method

**Files:**
- Modify: `lib/execution.ts`
- Modify: `lib/drift.ts`
- Create: `tests/unit/execution-routing.test.ts`
- Modify: `app/api/commands/[id]/publish/route.ts`
- Modify: `docs/runbook.md`
- Modify: `implementation.md`

1. Write failing unit tests for API route-template expansion: encode substitutions, reject missing substitutions, reject non-relative routes; test dispatch configuration preserves persisted HTTP method and app base URL.
2. Run `npm.cmd run test -- tests/unit/execution-routing.test.ts --reporter=verbose` and confirm RED.
3. Query the command's `app` relation during execution. Replace global-base-URL and POST-only dispatch with a small typed request builder that uses the persisted app base URL, API method, and encoded `apiRoute` template.
4. Keep Acme execution real by retaining its required internal execution token. Add only one Zendesk path: ticket update using configured server environment variables and a real payload of `{ ticket: ... }`.
5. Update drift checks to probe the command app's persisted base URL and route rather than `APP_BASE_URL`.
6. Publish validation must reject an unsupported app/provider or missing explicit API step rather than silently assuming a route.
7. Re-run the focused test and `npm.cmd run lint`.

## Task 4: Persist command versions and pause unsafe commands

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260716000000_customer_value_core/migration.sql`
- Modify: `app/api/commands/[id]/publish/route.ts`
- Create: `app/api/commands/[id]/versions/route.ts`
- Modify: `lib/execution.ts`
- Create: `tests/unit/execution-safety.test.ts`
- Modify: `docs/CAPABILITIES.md`
- Modify: `implementation.md`

1. Write failing unit tests for the consecutive-failure decision: exactly three latest real failures pause; a succeeding execution, fewer failures, and dry runs do not pause.
2. Run `npm.cmd run test -- tests/unit/execution-safety.test.ts --reporter=verbose` and confirm RED.
3. Add append-only `CommandVersion` records, unique per command/version number, with a JSON snapshot of the publishable command contract and command steps. Add a reversible additive SQL migration.
4. On publish, create the snapshot transactionally with the state transition and audit event. Expose versions read-only through the new route.
5. Implement the fixed three-failure safety guard in execution failure handling. On the third consecutive real failure, move a currently published command to `paused` and create a `command_auto_paused` audit entry. Dry runs never participate.
6. Re-run focused tests and `pnpm prisma:generate`.
7. Attempt `pnpm prisma:migrate:deploy`; if Docker remains unavailable, record the exact blocker rather than claiming the migration was applied.

## Task 5: Replace raw publish controls with guided fields and improve agent handoff

**Files:**
- Modify: `components/command/command-schema-editor.tsx`
- Modify: `app/(app)/commands/[id]/page.tsx`
- Modify: `app/(app)/mcp/page.tsx`
- Modify: `tests/unit/command-editor.test.ts`
- Modify: `README.md`
- Modify: `docs/CAPABILITIES.md`
- Modify: `implementation.md`

1. Write a failing unit test for the editor's conversion of guided route, method, and optional amount threshold values into the persisted command patch contract.
2. Run `npm.cmd run test -- tests/unit/command-editor.test.ts --reporter=verbose` and confirm RED.
3. Replace raw execution-step JSON and approval-rule JSON controls with route, HTTP-method, and optional approval-threshold fields. Retain raw JSON only for arbitrary input and output schemas.
4. Display persisted evidence references and publish-version history in the command detail view.
5. Generate the MCP quick-start request from an actual published command. If none exists, state that a command must be published; never show an Acme-only fabricated example.
6. Re-run focused tests, `npm.cmd run lint`, and `npx.cmd tsc --noEmit`.

## Task 6: Verify the complete available gate and publish truthful documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/runbook.md`
- Modify: `docs/CAPABILITIES.md`
- Modify: `implementation.md`
- Delete or rewrite: stale enterprise-only claims in `docs/ASSUMPTIONS.md` and `docs/enterprise-pilot-ga-audit.md`

1. Run `npm.cmd run test -- tests/unit --reporter=verbose`.
2. Run `npm.cmd run lint`, `npx.cmd tsc --noEmit`, and `npm.cmd run build`.
3. Run `pnpm prisma:generate` and attempt the migration/deploy command.
4. Attempt the full `npm.cmd run verify` gate only if Docker starts; otherwise state the Docker/virtualization blocker and enumerate the unavailable migration, integration, and Playwright proof.
5. Record all factual test outcomes, the trusted-proxy deployment boundary, Zendesk setup, live-connection behavior, auto-pause policy, and the remaining infrastructure limitation in `implementation.md`.
