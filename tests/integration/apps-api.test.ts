import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as getApps, POST as postApps } from "@/app/api/apps/route";
import { POST as testConnection } from "@/app/api/apps/[id]/test-connection/route";

const prisma = new PrismaClient();

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user available. Run seed.");
});

describe("apps api", () => {
  it("creates app and lists apps", async () => {
    const createReq = new Request("http://localhost:3000/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `API Test App ${Date.now()}`,
        type: "internal_web_app",
        provider_key: "internal_acme_support_admin",
        base_url: "http://localhost:3100",
        auth_method: "none",
        execution_mode: "hybrid",
      }),
    });

    const createRes = await postApps(createReq);
    expect(createRes.status).toBe(201);

    const listRes = await getApps();
    expect(listRes.status).toBe(200);
    const body = await listRes.json();
    expect(Array.isArray(body.apps)).toBe(true);
    expect(body.apps.length).toBeGreaterThan(0);
  });

  it("fails connection test when connector credentials are missing", async () => {
    const createReq = new Request("http://localhost:3000/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Stripe Missing Credential ${Date.now()}`,
        type: "api_schema",
        provider_key: "stripe",
        base_url: "https://api.stripe.com",
        auth_method: "bearer",
        auth_env_key: "DOES_NOT_EXIST",
        execution_mode: "api",
      }),
    });

    const createRes = await postApps(createReq);
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();

    const res = await testConnection(new Request("http://localhost:3000/api/apps/x/test-connection", { method: "POST" }), {
      params: Promise.resolve({ id: createdBody.app.id }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connection_status).toBe("failed");
    expect(String(body.error).toLowerCase()).toContain("credential error");
  });
});
