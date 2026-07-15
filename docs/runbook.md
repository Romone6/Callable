# runbook.md

## Local setup (PowerShell)

1. Copy env file
```powershell
Copy-Item .env.example .env
```
Default local mode is `AUTH_MODE=dev`. For production-style auth, set `AUTH_MODE=clerk` and configure Clerk keys.

2. Start Postgres
```powershell
pnpm db:up
```
Postgres runs on `localhost:55432` in this repo to avoid default local-port conflicts.

3. Install dependencies
```powershell
pnpm install
```

4. Run Prisma migration and seed
```powershell
pnpm prisma:migrate --name local_update
pnpm prisma:seed
```

5. Start app
```powershell
pnpm dev
```

Optional: start dedicated queue worker mode
```powershell
$env:EXECUTION_QUEUE_MODE = "worker"
pnpm worker
```

## Phase 4 verification gate (PowerShell)

Run the full release-quality gate in one command:
```powershell
pnpm verify:phase4
```

This executes:
- `pnpm db:up`
- `pnpm prisma:migrate --name phase4_verification`
- `pnpm prisma:seed`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm playwright:test`

## CI phase 4 gate

For non-interactive environments (CI), use:
```powershell
pnpm verify:phase4:ci
```

This uses `prisma migrate deploy` instead of `prisma migrate dev`.

Windows E2E fallback when bundled Chromium launch is blocked:
```powershell
$dev = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 12
try {
  $env:PLAYWRIGHT_BASE_URL = "http://localhost:3100"
  $env:PLAYWRIGHT_DISABLE_WEBSERVER = "true"
  $env:PLAYWRIGHT_CHANNEL = "msedge"
  npm.cmd run playwright:test -- --reporter=line --workers=1
} finally {
  Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue
}
```

## Ops preflight gate

Run production-readiness preflight (DB/Redis/provider/credential completeness):
```powershell
$env:OPENAI_API_KEY = "<required when DISCOVERY_PROVIDER=openai>"
pnpm verify:ops:preflight
```

Production object storage settings:
- `OBJECT_STORAGE_PROVIDER=s3`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_ACCESS_KEY_ID`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`
- Optional: `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_FORCE_PATH_STYLE=true` for S3-compatible vendors.

## Smoke flow

1. Open `http://localhost:3100/apps`, create app `Acme Support Admin` with `http://localhost:3100` and test connection.
2. Open `http://localhost:3100/discovery-sources`, upload SOP text.
3. Open `http://localhost:3100/discover-commands`, run discovery (requires `OPENAI_API_KEY`).
4. Accept candidate to generate command.
5. Publish command in `http://localhost:3100/commands`.
6. Run command in command detail page with amount 25 (executes immediately) and with amount 450 (requires approval).
7. Approve in `http://localhost:3100/approvals`.
8. Run drift check in `http://localhost:3100/drift-monitor`.
9. Inspect logs in `http://localhost:3100/audit-logs`.

## Agent API / MCP smoke

1. Create an API key via `http://localhost:3100/mcp-api` or `POST /api/api-keys`.
2. Call MCP endpoint with bearer key:
```powershell
$headers = @{
  Authorization = "Bearer <api_key>"
  "Content-Type" = "application/json"
  "x-idempotency-key" = "demo-1"
}
$body = '{"tool":"list_commands","args":{}}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/mcp" -Headers $headers -Body $body
```

3. Fetch versioned REST contract (`OpenAPI v1`):
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/v1/openapi"
```

4. Fetch MCP invocation audit stream (requires API key scope `audit:read`):
```powershell
$headers = @{
  Authorization = "Bearer <api_key>"
}
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/mcp/audit?tool=list_commands&outcome=succeeded&limit=20" -Headers $headers
```

5. Fetch scoped enterprise audit events with pagination:
```powershell
$headers = @{
  Authorization = "Bearer <api_key>"
}
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/audit/events?event_type=mcp_tool_invocation&actor_type=agent&limit=50" -Headers $headers
```

6. Create or update approval policy graph:
```powershell
$headers = @{
  "Content-Type" = "application/json"
}
$create = '{
  "name":"Finance Approval Policy",
  "status":"active",
  "is_default":true,
  "policy_json":{
    "thresholds":{"amount_greater_than":200},
    "stages":[{"name":"finance_review","required_role":"admin","amount_greater_than":200}],
    "scenario_gates":["refund_flow"],
    "exception_paths":["vip_escalation"]
  }
}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/approval-policies" -Headers $headers -Body $create
```

```powershell
$headers = @{
  "Content-Type" = "application/json"
}
$update = '{
  "id":"<approval_policy_id>",
  "status":"paused",
  "is_default":false
}'
Invoke-WebRequest -Method Patch -Uri "http://localhost:3100/api/approval-policies" -Headers $headers -Body $update
```

7. Simulate auto-send decision with policy guardrails:
```powershell
$headers = @{
  "Content-Type" = "application/json"
}
$body = '{
  "command_id":"<command_id>",
  "scenario":"refund_flow",
  "confidence":0.93,
  "violations":[],
  "input":{"amount":120},
  "bypass_request":false
}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/auto-send/simulate" -Headers $headers -Body $body
```

8. Fetch immutable send event ledger record:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/send-events/<send_event_id>"
```

## Compliance exports / retention / purge

1. Get effective retention policy:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/compliance/retention"
```

2. Update retention policy:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"audit_log_days":30,"approval_days":30,"execution_days":30}'
Invoke-WebRequest -Method Patch -Uri "http://localhost:3100/api/compliance/retention" -Headers $headers -Body $body
```

3. Create compliance export artifact:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"resource":"audit_logs","format":"json","limit":1000}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/compliance/exports" -Headers $headers -Body $body
```

4. List export artifacts:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/compliance/exports"
```

5. Download export artifact:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/compliance/exports/<export_id>/download"
```

6. Rotate export signing key:
```powershell
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/compliance/export-signing-keys"
```

7. Run purge dry-run:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"dry_run":true,"resource":"all"}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/compliance/purge" -Headers $headers -Body $body
```

## Scheduled cron triggers

Use scheduler JWT bearer token with:
- `iss` = `CRON_JWT_ISSUER`
- `aud` = `CRON_JWT_AUDIENCE`
- `sub` = `scheduler`

Cron verifier mode:
- `CRON_JWT_VERIFIER_MODE=legacy|hybrid|jwks`
- Production recommendation: `CRON_JWT_VERIFIER_MODE=jwks`

1. Scheduled retention purge:
```powershell
$token = "<scheduler_jwt>"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$body = '{"dry_run":false,"resource":"all"}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/cron/purge-retention" -Headers $headers -Body $body
```

2. Scheduled drift scan:
```powershell
$token = "<scheduler_jwt>"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$body = '{"max_commands":100}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/cron/drift-scan" -Headers $headers -Body $body
```

## Cron JWKS key rotation (admin)

1. List current cron JWKS verifier keys:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/security/cron-jwks"
```

2. Rotate cron JWKS key (public JWK only):
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"jwk":{"kid":"scheduler-key-2026-05","kty":"RSA","alg":"RS256","use":"sig","n":"<base64url_n>","e":"AQAB"},"grace_window_minutes":60}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/security/cron-jwks" -Headers $headers -Body $body
```

## Connector credential lifecycle smoke

Store encrypted connector credentials (example: app id `app_123`):
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{\"credentials\":{\"auth_token\":\"sk_test_xxx\",\"username\":\"ops@example.com\"}}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/apps/app_123/credentials" -Headers $headers -Body $body
```

Revoke encrypted connector credentials:
```powershell
Invoke-WebRequest -Method Delete -Uri "http://localhost:3100/api/apps/app_123/credentials"
```

## Organisation security policy (IAM controls baseline)

1. Get effective organisation security policy:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/security/policy"
```

2. Update security policy (owner/admin):
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"session_timeout_minutes":120,"api_key_ttl_days":30,"require_mfa":true,"ip_allowlist":["203.0.113.0/24","198.51.100.10"]}'
Invoke-WebRequest -Method Patch -Uri "http://localhost:3100/api/security/policy" -Headers $headers -Body $body
```

## Custom role management (enterprise IAM)

1. List built-in and custom roles plus current user-role assignments:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/security/roles"
```

2. Create a custom role:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"role_key":"incident_reviewer","name":"Incident Reviewer","permissions":["executions:read","drift:read","approvals:read"]}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/security/roles" -Headers $headers -Body $body
```

3. Assign role to a user:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"user_id":"<user_id>","role":"custom:incident_reviewer"}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/security/roles/assign" -Headers $headers -Body $body
```

## Queue and worker observability

1. Queue health (includes counts + failed-job samples):
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/ops/queue-health?failed_limit=10"
```

2. Worker status (heartbeat visibility):
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/ops/worker-status"
```

3. Replay failed queue job:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"queue":"execution","job_id":"<failed_job_id>"}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/ops/queue-health/replay" -Headers $headers -Body $body
```

4. Acknowledge (triage + remove) failed queue job:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"queue":"execution","job_id":"<failed_job_id>","note":"triaged after incident review"}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/ops/queue-health/ack" -Headers $headers -Body $body
```

## SLO summary dashboard API

Retrieve rolling enterprise SLO summary metrics:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/ops/slo-summary?lookback_hours=24"
```

## SLO alert evaluation and dispatch

1. Evaluate SLO alert breaches for a rolling window:
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:3100/api/ops/slo-alerts?lookback_hours=24"
```

2. Dry-run alert dispatch payload generation:
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"lookback_hours":24,"dry_run":true}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/ops/slo-alerts" -Headers $headers -Body $body
```

3. Dispatch alerts to webhook (requires alerts and operator/admin/owner role):
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = '{"lookback_hours":24,"webhook_url":"https://alerts.example.com/hooks/verblayer"}'
Invoke-WebRequest -Method Post -Uri "http://localhost:3100/api/ops/slo-alerts" -Headers $headers -Body $body
```

## Frontend UX smoke (Windows PowerShell)

Run the full Playwright suite against an already-running local server on `http://localhost:3100`:
```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3100'
$env:PLAYWRIGHT_DISABLE_WEBSERVER='true'
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm playwright:test -- --reporter=line --workers=1
```
