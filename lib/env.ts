import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_BASE_URL: z.string().url().default("http://localhost:3100"),
  AUTH_MODE: z.enum(["dev", "clerk"]).default("dev"),
  ALLOW_DEV_AUTH_MODE: z.enum(["true", "false"]).default("true"),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  DISCOVERY_PROVIDER: z.enum(["openai", "anthropic", "openrouter"]).default("openai"),
  INTERNAL_EXECUTION_TOKEN: z.string().default("local-dev-token"),
  REDIS_URL: z.string().default("redis://localhost:56379"),
  EXECUTION_QUEUE_ENABLED: z.enum(["true", "false"]).default("true"),
  EXECUTION_QUEUE_MODE: z.enum(["inline", "worker", "off"]).default("inline"),
  CONNECTOR_CREDENTIALS_KEY: z.string().default("local-dev-connector-key-change-me"),
  EXPORT_SIGNING_KEY_BOOTSTRAP: z.string().optional(),
  OBJECT_STORAGE_PROVIDER: z.enum(["s3", "memory"]).default("memory"),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().default("us-east-1"),
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
  CRON_JWT_ISSUER: z.string().default("verblayer-scheduler"),
  CRON_JWT_AUDIENCE: z.string().default("verblayer-cron"),
  CRON_JWT_VERIFIER_MODE: z.enum(["legacy", "hybrid", "jwks"]).default("hybrid"),
  CRON_JWT_ALGORITHM: z.enum(["HS256", "RS256"]).default("HS256"),
  CRON_JWT_HS256_SECRET: z.string().default("local-cron-jwt-secret"),
  CRON_JWT_PUBLIC_KEY: z.string().optional(),
  API_KEY_ALLOWED_ORIGINS: z.string().default("http://localhost:3100"),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

if (parsed.data.NODE_ENV === "production" && parsed.data.AUTH_MODE !== "clerk" && parsed.data.ALLOW_DEV_AUTH_MODE !== "true") {
  throw new Error("AUTH_MODE must be 'clerk' in production.");
}

if (parsed.data.AUTH_MODE === "clerk") {
  if (!parsed.data.CLERK_SECRET_KEY || !parsed.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error("Clerk auth mode requires CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.");
  }
}

if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.OBJECT_STORAGE_PROVIDER !== "s3" &&
  parsed.data.ALLOW_DEV_AUTH_MODE !== "true"
) {
  throw new Error("OBJECT_STORAGE_PROVIDER must be 's3' in production.");
}

if (parsed.data.CRON_JWT_ALGORITHM === "HS256" && !parsed.data.CRON_JWT_HS256_SECRET) {
  throw new Error("CRON_JWT_HS256_SECRET is required when CRON_JWT_ALGORITHM=HS256.");
}

if (parsed.data.CRON_JWT_ALGORITHM === "RS256" && !parsed.data.CRON_JWT_PUBLIC_KEY) {
  throw new Error("CRON_JWT_PUBLIC_KEY is required when CRON_JWT_ALGORITHM=RS256.");
}

if (parsed.data.NODE_ENV === "production" && parsed.data.CRON_JWT_VERIFIER_MODE !== "jwks" && parsed.data.ALLOW_DEV_AUTH_MODE !== "true") {
  throw new Error("CRON_JWT_VERIFIER_MODE must be 'jwks' in production.");
}

export const env = parsed.data;

