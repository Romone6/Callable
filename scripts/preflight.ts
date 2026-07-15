import { prisma } from "../lib/db";
import { env } from "../lib/env";
import IORedis from "ioredis";
import { getEffectiveRetentionPolicy } from "../lib/retention";
import { getDecryptedCredentials } from "../lib/connector-credentials";
import { metadataString, resolveProviderKeyFromMetadata } from "../lib/connectors/metadata";
import { writeComplianceArtifact, readComplianceArtifact } from "../lib/compliance-artifacts";

async function checkDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

async function checkRedis() {
  if (env.EXECUTION_QUEUE_ENABLED !== "true") return;
  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableReadyCheck: true });
  try {
    const pong = await redis.ping();
    if (pong !== "PONG") {
      throw new Error(`Unexpected redis response: ${pong}`);
    }
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

function checkProviderKeys() {
  if (env.DISCOVERY_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
    throw new Error("DISCOVERY_PROVIDER=openai requires OPENAI_API_KEY");
  }
  if (env.DISCOVERY_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
    throw new Error("DISCOVERY_PROVIDER=anthropic requires ANTHROPIC_API_KEY");
  }
  if (env.DISCOVERY_PROVIDER === "openrouter" && !env.OPENROUTER_API_KEY) {
    throw new Error("DISCOVERY_PROVIDER=openrouter requires OPENROUTER_API_KEY");
  }
}

async function checkConnectorCredentialCompleteness() {
  const apps = await prisma.app.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      connectionStatus: true,
      metadataJson: true,
    },
  });

  const issues: string[] = [];

  for (const app of apps) {
    if (app.connectionStatus !== "connected") continue;

    const provider = resolveProviderKeyFromMetadata(app.type, app.metadataJson);
    if (provider !== "stripe" && provider !== "zendesk" && provider !== "hubspot") continue;

    const metadata = app.metadataJson;
    const encrypted = getDecryptedCredentials(metadata);

    if (provider === "stripe" || provider === "hubspot") {
      const envKey = metadataString((metadata as Record<string, unknown>) ?? {}, "auth_env_key");
      const envValue = envKey ? process.env[envKey] : null;
      const secret = encrypted?.auth_token ?? envValue;
      if (!secret) {
        issues.push(`App '${app.name}' (${provider}) missing auth token credential.`);
      }
    }

    if (provider === "zendesk") {
      const tokenEnvKey = metadataString((metadata as Record<string, unknown>) ?? {}, "auth_env_key");
      const usernameEnvKey = metadataString((metadata as Record<string, unknown>) ?? {}, "username_env_key");
      const tokenValue = tokenEnvKey ? process.env[tokenEnvKey] : null;
      const usernameValue = usernameEnvKey ? process.env[usernameEnvKey] : null;
      const token = encrypted?.auth_token ?? tokenValue;
      const username = encrypted?.username ?? usernameValue;
      if (!token || !username) {
        issues.push(`App '${app.name}' (zendesk) missing token/username credential.`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(`Connector credential issues:\n- ${issues.join("\n- ")}`);
  }
}

async function checkRetentionPolicyAccessibility() {
  const org = await prisma.organisation.findFirst({ select: { id: true } });
  if (!org) return;
  await getEffectiveRetentionPolicy(org.id);
}

async function checkCronAuthConfig() {
  if (!env.CRON_JWT_ISSUER || !env.CRON_JWT_AUDIENCE) {
    throw new Error("CRON_JWT_ISSUER and CRON_JWT_AUDIENCE are required.");
  }

  if (env.CRON_JWT_VERIFIER_MODE === "jwks" || env.CRON_JWT_VERIFIER_MODE === "hybrid") {
    const activeOrGrace = await prisma.cronJwksKey.findFirst({
      where: {
        OR: [
          { status: "active" },
          {
            status: "grace",
            OR: [{ graceUntil: null }, { graceUntil: { gte: new Date() } }],
          },
        ],
      },
      select: { id: true },
    });
    if (!activeOrGrace && env.CRON_JWT_VERIFIER_MODE === "jwks") {
      throw new Error("CRON_JWT_VERIFIER_MODE=jwks requires at least one active/grace cron JWKS key.");
    }
  }

  if (env.CRON_JWT_VERIFIER_MODE !== "jwks") {
    if (env.CRON_JWT_ALGORITHM === "HS256" && (!env.CRON_JWT_HS256_SECRET || env.CRON_JWT_HS256_SECRET.trim().length < 12)) {
      throw new Error("CRON_JWT_HS256_SECRET is missing or too short (min 12 chars).");
    }
    if (env.CRON_JWT_ALGORITHM === "RS256" && !env.CRON_JWT_PUBLIC_KEY) {
      throw new Error("CRON_JWT_PUBLIC_KEY is required for RS256.");
    }
  }
}

function checkObjectStorageConfig() {
  if (env.OBJECT_STORAGE_PROVIDER === "s3") {
    if (!env.OBJECT_STORAGE_BUCKET) {
      throw new Error("OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_PROVIDER=s3.");
    }
    if (!env.OBJECT_STORAGE_ACCESS_KEY_ID || !env.OBJECT_STORAGE_SECRET_ACCESS_KEY) {
      throw new Error("OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_SECRET_ACCESS_KEY are required for s3 storage.");
    }
  }
}

async function checkObjectStorageRoundTrip() {
  const artifactPath = await writeComplianceArtifact({
    organisationId: "preflight",
    resource: "health",
    format: "json",
    payload: JSON.stringify({ ok: true }),
  });
  const payload = await readComplianceArtifact(artifactPath);
  if (!payload.includes("\"ok\":true")) {
    throw new Error("Object storage round-trip payload mismatch.");
  }
}

async function main() {
  const checks: Array<{ name: string; run: () => Promise<void> | void }> = [
    { name: "provider-config", run: checkProviderKeys },
    { name: "database", run: checkDatabase },
    { name: "redis", run: checkRedis },
    { name: "retention-policy", run: checkRetentionPolicyAccessibility },
    { name: "cron-auth-config", run: checkCronAuthConfig },
    { name: "object-storage-config", run: checkObjectStorageConfig },
    { name: "object-storage-roundtrip", run: checkObjectStorageRoundTrip },
    { name: "connector-credentials", run: checkConnectorCredentialCompleteness },
  ];

  const failures: string[] = [];

  for (const check of checks) {
    try {
      await check.run();
      console.log(`[ok] ${check.name}`);
    } catch (error) {
      failures.push(`[failed] ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(failure));
    process.exit(1);
  }

  console.log("Preflight checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
