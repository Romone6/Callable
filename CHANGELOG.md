# Changelog

All notable public changes are recorded here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versioning after its first public release.

## Unreleased

### Changed

- Renamed the project, GitHub repository, protocol headers, default Postgres identifiers, package, and public API identity from VerblLayer to Callable. This is a breaking deployment change for trusted-proxy header configuration. New local installations use the Callable database defaults; upgraded installations keep their existing connection string and physical data volume until deliberately migrated.

### Added

- Self-hosted public core for discovering real workflow evidence and publishing reviewed, agent-callable commands.
- Controlled Acme Support Admin target and narrow Zendesk ticket-update execution path.
- Trusted-proxy console authentication boundary, command versions, approvals, audit records, route-level drift checks, and repeated-failure pausing.

### Removed

- Hosted authentication, enterprise identity features, queues, browser fallback, generic connector claims, compliance operations, and simulated product surfaces.
