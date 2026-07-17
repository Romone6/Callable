# AGENTS.md

## Product

Callable is an agent-native command layer for existing business software.

It discovers workflows inside real business tools or real workflow evidence, turns them into structured commands and exposes those commands to AI agents through MCP and REST APIs.

## Non-negotiable rule: no mocks

Do not build mocks.

No mock execution engine.
No fake command results.
No hardcoded workflow discovery.
No placeholder integrations labelled as real.
No fake dashboard metrics.
No static MCP responses.
No simulated success states.
No fabricated audit logs.
No fake drift status.

If a feature is unavailable, mark it as unavailable.
If a connection fails, show the real error.
If discovery cannot find a workflow, return no workflow found.
If execution fails, log the actual failure.

The MVP must be narrow but real.

## Correct product framing

Do not build Callable as:
- a company brain
- a generic knowledge base
- a chatbot
- an RPA clone
- a document Q&A tool
- a frontend-only demo

Build Callable as:
- a command layer for business software
- a semantic wrapper for existing workflows
- an MCP/API gateway for agent-executable commands
- a safe execution system with approvals, audit logs and drift checks

## Core MVP flow

The main MVP flow is:

1. User creates workspace.
2. User registers a real target app.
3. User uploads real workflow evidence such as SOPs, CSV exports or traces.
4. Callable discovers workflow candidates from that evidence.
5. User accepts a candidate.
6. Callable generates a command schema.
7. User reviews and publishes the command.
8. Agent calls command through MCP/API.
9. Callable executes command through real API/browser automation.
10. Execution is logged.
11. Drift checks verify command health.

## Supported first target

Use a real internal controlled target app if external SaaS credentials are unavailable.

This app must have:
- real database records
- real forms
- real API routes
- real state changes
- real browser-executable workflows

It must not return fake success.

## Safety requirements

Every command must support:
- input validation
- output schema
- risk level
- approval rules
- dry-run where possible
- execution records
- audit logs
- error handling
- drift status

High-risk commands require approval.

## Design system

Use the dark emerald and lime SaaS visual direction.

Primary colours:
- deep emerald / near black green
- lime accent
- cream sections
- muted grey text

The product should feel:
- technical
- premium
- infrastructure-grade
- secure
- clear
- enterprise-ready

## Engineering standards

Use TypeScript.
Use strict types.
Use real database persistence.
Use proper error handling.
Use server-side validation.
Use environment variables for secrets.
Never expose API keys in the frontend.
Log important events.
Write code in small, maintainable modules.

## Required docs

Maintain implementation.md as the build plan and progress tracker.

Update implementation.md whenever:
- a phase is started
- a phase is completed
- an API route is added
- schema changes
- a known limitation appears
- a test result is produced
