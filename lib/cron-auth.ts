import { env } from "@/lib/env";
import { createLocalJWKSet, decodeProtectedHeader, importSPKI, jwtVerify } from "jose";
import { getActiveAndGraceCronJwks } from "@/lib/cron-jwks";

let cachedRsKey: CryptoKey | null = null;

async function verificationKey() {
  if (env.CRON_JWT_ALGORITHM === "HS256") {
    return new TextEncoder().encode(env.CRON_JWT_HS256_SECRET);
  }
  if (!cachedRsKey) {
    const pem = (env.CRON_JWT_PUBLIC_KEY as string).replace(/\\n/g, "\n");
    cachedRsKey = await importSPKI(pem, "RS256");
  }
  return cachedRsKey;
}

async function verifyWithJwks(token: string) {
  const header = decodeProtectedHeader(token);
  if (!header.kid) {
    throw new Error("Unauthorized: missing key id (kid) in cron JWT");
  }
  if (header.alg !== "RS256") {
    throw new Error("Unauthorized: cron JWKS verification requires RS256 token");
  }

  const keyset = await getActiveAndGraceCronJwks();
  const allKeys = [...keyset.active, ...keyset.grace];
  if (allKeys.length === 0) {
    throw new Error("Unauthorized: no active cron JWKS keys configured");
  }

  const jwksResolver = createLocalJWKSet({ keys: allKeys });
  return jwtVerify(token, jwksResolver, {
    issuer: env.CRON_JWT_ISSUER,
    audience: env.CRON_JWT_AUDIENCE,
    algorithms: ["RS256"],
  });
}

export async function requireCronAuth(request: Request) {
  const bearer = request.headers.get("authorization");
  const token = bearer?.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : null;
  if (!token) {
    throw new Error("Unauthorized: missing cron JWT");
  }

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];

  if (env.CRON_JWT_VERIFIER_MODE === "jwks") {
    payload = (await verifyWithJwks(token)).payload;
  } else if (env.CRON_JWT_VERIFIER_MODE === "hybrid") {
    const header = decodeProtectedHeader(token);
    if (header.kid || header.alg === "RS256") {
      try {
        payload = (await verifyWithJwks(token)).payload;
      } catch {
        const key = await verificationKey();
        payload = (
          await jwtVerify(token, key, {
            issuer: env.CRON_JWT_ISSUER,
            audience: env.CRON_JWT_AUDIENCE,
            algorithms: [env.CRON_JWT_ALGORITHM],
          })
        ).payload;
      }
    } else {
      const key = await verificationKey();
      payload = (
        await jwtVerify(token, key, {
          issuer: env.CRON_JWT_ISSUER,
          audience: env.CRON_JWT_AUDIENCE,
          algorithms: [env.CRON_JWT_ALGORITHM],
        })
      ).payload;
    }
  } else {
    const key = await verificationKey();
    payload = (
      await jwtVerify(token, key, {
        issuer: env.CRON_JWT_ISSUER,
        audience: env.CRON_JWT_AUDIENCE,
        algorithms: [env.CRON_JWT_ALGORITHM],
      })
    ).payload;
  }

  if (payload.sub !== "scheduler") {
    throw new Error("Unauthorized: invalid cron subject");
  }
}
