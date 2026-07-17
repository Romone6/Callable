# Contributing to Callable

Callable is a narrow, self-hosted command layer for real business workflows. Contributions must make the real path clearer, safer, or easier to operate.

## Before opening a pull request

```powershell
pnpm install
pnpm db:up
pnpm prisma:migrate:deploy
pnpm prisma:seed
pnpm lint
pnpm test
pnpm build
pnpm playwright:test
```

Run the smallest relevant test before editing behaviour, then rerun it after the change. If Docker is unavailable, state that database and browser proof could not run; do not represent skipped checks as passing.

## Public-core rules

- Do not add mocks that imitate discovery, execution, audit records, metrics, or drift health.
- Do not add a connector merely to populate a catalogue. Each execution target needs a real, documented contract and persisted-state proof.
- Preserve organisation scoping, server-side validation, approval rules, audit records, error reporting, and drift status.
- Keep external credentials in server environment variables. Never commit them or expose them to the browser.
- Update `implementation.md` when a phase, API route, schema, limitation, or verification result changes.

## Pull requests

Keep one concern per pull request. Include the problem, the proof command and output, migration impact, documentation updates, and any deployment prerequisite. Use the supplied template and follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
