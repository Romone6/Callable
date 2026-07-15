import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { redactSecret } from "@/lib/api-key-auth";

async function getRequestId() {
  try {
    const requestHeaders = await headers();
    return requestHeaders.get("x-request-id");
  } catch {
    return null;
  }
}

export async function ok(data: unknown, status = 200) {
  return NextResponse.json(
    {
      request_id: await getRequestId(),
      ...((data as Record<string, unknown>) ?? {}),
    },
    { status },
  );
}

export async function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code: "bad_request",
        message,
        details,
        request_id: await getRequestId(),
      },
    },
    { status: 400 },
  );
}

export async function notFound(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "not_found",
        message,
        request_id: await getRequestId(),
      },
    },
    { status: 404 },
  );
}

export async function unauthorized(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "unauthorized",
        message,
        request_id: await getRequestId(),
      },
    },
    { status: 401 },
  );
}

export async function forbidden(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "forbidden",
        message,
        request_id: await getRequestId(),
      },
    },
    { status: 403 },
  );
}

export async function tooManyRequests(message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message,
        details,
        request_id: await getRequestId(),
      },
    },
    { status: 429 },
  );
}

export async function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const normalized = message.toLowerCase();
  if (normalized.startsWith("unauthorized")) {
    return unauthorized(message);
  }
  if (normalized.startsWith("forbidden")) {
    return forbidden(message);
  }
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: "api_error",
      request_id: await getRequestId(),
      message: redactSecret(message),
    }),
  );

  return NextResponse.json(
    {
      error: {
        code: "server_error",
        message,
        request_id: await getRequestId(),
      },
    },
    { status: 500 },
  );
}

