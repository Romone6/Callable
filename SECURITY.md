# Security policy

## Reporting a vulnerability

Do not file vulnerabilities in public issues, pull requests, Discussions, or chat. Use [GitHub private vulnerability reporting](https://github.com/Romone6/Callable/security/advisories/new) for this repository instead.

A useful report includes the affected commit, attack preconditions, a minimal reproduction, impact, and redacted logs. Do not include API keys, database URLs, proxy secrets, customer records, or other credentials. Maintainers should acknowledge reports privately and coordinate a fix before public disclosure.

## Supported deployment posture

The web console requires a trusted identity proxy in production. The proxy must strip client-supplied `x-callable-*` headers and inject the authenticated organisation, email, and shared secret. Callable resolves only existing users and stored roles; it does not provision users from headers.

Use `next build` and `next start` for production, keep credentials server-side, and put a rate-limiting reverse proxy or equivalent edge layer in front of public deployments. See [docs/runbook.md](docs/runbook.md) for the deployment contract.
