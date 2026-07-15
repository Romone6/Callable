import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/openapi";

export async function GET(request: Request) {
  const spec = buildOpenApiSpec(request);
  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  });
}
