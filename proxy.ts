import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders, corsResponse, isApiKeyRoute, isOriginAllowed } from "@/lib/api-security";

function requestId() {
  return crypto.randomUUID();
}

function withRequestContext(request: NextRequest) {
  const id = request.headers.get("x-request-id") ?? requestId();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", id);

  if (request.nextUrl.pathname.startsWith("/api")) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        event: "api_request",
        request_id: id,
        method: request.method,
        path: request.nextUrl.pathname,
      }),
    );
  }

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", id);
  return applySecurityHeaders(response);
}

const clerkModeProxy = clerkMiddleware(async (auth, request) => {
  const { userId, redirectToSignIn } = await auth();
  const path = request.nextUrl.pathname;

  const publicPaths = [
    "/",
    "/product",
    "/solutions",
    "/integrations",
    "/docs",
    "/pricing",
    "/about",
    "/sign-in",
    "/sign-up",
    "/api/health",
  ];

  const isPublic = publicPaths.some((entry) => path === entry || path.startsWith(`${entry}/`));
  const isAgentOrMcp = path.startsWith("/api/agent") || path.startsWith("/api/mcp");
  const isCron = path.startsWith("/api/cron");

  if (!isPublic && !isAgentOrMcp && !isCron && !userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }

  return withRequestContext(request);
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isApiKeyRoute(request.nextUrl.pathname)) {
    if (request.method === "OPTIONS") {
      return applySecurityHeaders(corsResponse(request));
    }
    if (!isOriginAllowed(request.headers.get("origin"))) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: {
              code: "cors_forbidden",
              message: `Origin '${request.headers.get("origin")}' is not allowed.`,
            },
          },
          { status: 403 },
        ),
      );
    }
  }

  if (process.env.AUTH_MODE === "clerk") {
    return clerkModeProxy(request, event);
  }
  return withRequestContext(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
