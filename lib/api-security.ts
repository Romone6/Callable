import { NextResponse } from "next/server";
import { env } from "@/lib/env";

function allowedOrigins() {
  return env.API_KEY_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isApiKeyRoute(pathname: string) {
  return pathname.startsWith("/api/agent") || pathname.startsWith("/api/mcp");
}

export function isOriginAllowed(origin: string | null) {
  if (!origin) return true;
  return allowedOrigins().includes(origin);
}

export function corsResponse(request: Request, status = 204) {
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: { code: "cors_forbidden", message: `Origin '${origin}' is not allowed.` } },
      { status: 403 },
    );
  }

  const response = new NextResponse(null, { status });
  if (origin) {
    response.headers.set("access-control-allow-origin", origin);
    response.headers.set("vary", "origin");
  }
  response.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  response.headers.set("access-control-allow-headers", "authorization,content-type,x-idempotency-key,x-request-id");
  response.headers.set("access-control-max-age", "600");
  return response;
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';",
  );
  if (env.NODE_ENV === "production") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  }
  return response;
}
