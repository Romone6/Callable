import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

type Check = { status: "ok" | "error" | "unavailable"; detail: string };
export type ReadinessReport = { status: "ok" | "degraded"; service: "callable"; timestamp: string; checks: { database: Check; discovery: Check; localAuth: Check } };

async function database(): Promise<Check> {
  try { await prisma.$queryRaw`SELECT 1`; return { status: "ok", detail: "database reachable" }; }
  catch (error) { return { status: "error", detail: error instanceof Error ? error.message : String(error) }; }
}

function discovery(): Check {
  const configured = (env.DISCOVERY_PROVIDER === "openai" && env.OPENAI_API_KEY) || (env.DISCOVERY_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) || (env.DISCOVERY_PROVIDER === "openrouter" && env.OPENROUTER_API_KEY);
  return configured ? { status: "ok", detail: `${env.DISCOVERY_PROVIDER} discovery configured` } : { status: "unavailable", detail: `${env.DISCOVERY_PROVIDER} discovery key is not configured` };
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [databaseCheck] = await Promise.all([database()]);
  const discoveryCheck = discovery();
  const localAuth: Check = env.DEV_AUTH_ENABLED ? { status: "ok", detail: "development-only local console auth enabled" } : { status: "unavailable", detail: "local console auth disabled" };
  return { status: databaseCheck.status === "error" ? "degraded" : "ok", service: "callable", timestamp: new Date().toISOString(), checks: { database: databaseCheck, discovery: discoveryCheck, localAuth } };
}
