import { prisma } from "@/lib/db";

type SecurityPolicy = {
  session_timeout_minutes: number;
  api_key_ttl_days: number;
  require_mfa: boolean;
  ip_allowlist: string[];
  created_at: string;
  updated_at: string;
};

type SessionPolicyInput = {
  session_timeout_minutes: number;
  require_mfa: boolean;
  session_claims?: Record<string, unknown> | null;
  now_ms?: number;
};

function parseAllowlist(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean);
}

export function normalizeRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || null;
}

export function assertIpAllowed(request: Request, allowlist: string[]) {
  if (allowlist.length === 0) return;
  const ip = normalizeRequestIp(request);
  if (!ip) {
    throw new Error("Forbidden: request IP unavailable for allowlist policy enforcement");
  }

  const allowed = allowlist.some((entry) => ipMatchesAllowlistEntry(ip, entry));
  if (!allowed) {
    throw new Error(`Forbidden: request IP '${ip}' is not in allowlist`);
  }
}

function ipMatchesAllowlistEntry(ip: string, entry: string): boolean {
  if (entry === ip) {
    return true;
  }

  if (!entry.includes("/")) {
    return false;
  }

  return matchesIpv4Cidr(ip, entry);
}

function matchesIpv4Cidr(ip: string, cidr: string): boolean {
  const [baseIp, prefixRaw] = cidr.split("/");
  if (!baseIp || !prefixRaw) return false;

  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = ipv4ToInt(ip);
  const baseNum = ipv4ToInt(baseIp);
  if (ipNum === null || baseNum === null) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

function ipv4ToInt(input: string): number | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    value = (value << 8) | octet;
  }

  return value >>> 0;
}

export async function getEffectiveSecurityPolicy(organisationId: string): Promise<SecurityPolicy> {
  const policy = await prisma.organisationSecurityPolicy.upsert({
    where: { organisationId },
    update: {},
    create: {
      organisationId,
      sessionTimeoutMinutes: 480,
      apiKeyTtlDays: 90,
      requireMfa: false,
      ipAllowlistJson: [],
    },
  });

  return {
    session_timeout_minutes: policy.sessionTimeoutMinutes,
    api_key_ttl_days: policy.apiKeyTtlDays,
    require_mfa: policy.requireMfa,
    ip_allowlist: parseAllowlist(policy.ipAllowlistJson),
    created_at: policy.createdAt.toISOString(),
    updated_at: policy.updatedAt.toISOString(),
  };
}

export async function updateSecurityPolicy(
  organisationId: string,
  payload: {
    session_timeout_minutes: number;
    api_key_ttl_days: number;
    require_mfa: boolean;
    ip_allowlist: string[];
  },
): Promise<SecurityPolicy> {
  const updated = await prisma.organisationSecurityPolicy.upsert({
    where: { organisationId },
    update: {
      sessionTimeoutMinutes: payload.session_timeout_minutes,
      apiKeyTtlDays: payload.api_key_ttl_days,
      requireMfa: payload.require_mfa,
      ipAllowlistJson: payload.ip_allowlist,
    },
    create: {
      organisationId,
      sessionTimeoutMinutes: payload.session_timeout_minutes,
      apiKeyTtlDays: payload.api_key_ttl_days,
      requireMfa: payload.require_mfa,
      ipAllowlistJson: payload.ip_allowlist,
    },
  });

  return {
    session_timeout_minutes: updated.sessionTimeoutMinutes,
    api_key_ttl_days: updated.apiKeyTtlDays,
    require_mfa: updated.requireMfa,
    ip_allowlist: parseAllowlist(updated.ipAllowlistJson),
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  };
}

export function assertSessionSecurityPolicy(input: SessionPolicyInput) {
  const claims = input.session_claims ?? {};

  if (input.require_mfa && !hasMfaSatisfied(claims)) {
    throw new Error("Forbidden: organisation policy requires MFA for this session");
  }

  if (input.session_timeout_minutes > 0) {
    const issuedAtSeconds = Number(claims.iat);
    if (!Number.isFinite(issuedAtSeconds) || issuedAtSeconds <= 0) {
      throw new Error("Forbidden: unable to validate session age for policy enforcement");
    }

    const nowMs = input.now_ms ?? Date.now();
    const ageMs = nowMs - issuedAtSeconds * 1000;
    if (ageMs > input.session_timeout_minutes * 60 * 1000) {
      throw new Error("Unauthorized: session exceeded organisation timeout policy");
    }
  }
}

function hasMfaSatisfied(claims: Record<string, unknown>) {
  const fvaRaw = claims.fva;
  if (Array.isArray(fvaRaw) && fvaRaw.length > 1) {
    const secondFactorAge = Number(fvaRaw[1]);
    if (Number.isFinite(secondFactorAge) && secondFactorAge >= 0) {
      return true;
    }
  }

  const amrRaw = claims.amr;
  if (Array.isArray(amrRaw) && amrRaw.some((value) => String(value).toLowerCase().includes("mfa"))) {
    return true;
  }

  return false;
}
