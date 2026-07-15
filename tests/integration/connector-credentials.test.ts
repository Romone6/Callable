import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as postApps } from "@/app/api/apps/route";
import { POST as rotateCredentials, DELETE as revokeCredentials } from "@/app/api/apps/[id]/credentials/route";

const prisma = new PrismaClient();

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user available. Run seed.");
});

describe("connector credential lifecycle", () => {
  it("stores encrypted credentials on create and supports rotate/revoke", async () => {
    const createReq = new Request("http://localhost:3000/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Credential App ${Date.now()}`,
        type: "api_schema",
        provider_key: "stripe",
        base_url: "https://api.stripe.com",
        auth_method: "bearer",
        execution_mode: "api",
        credentials: {
          auth_token: "sk_test_created_secret",
        },
      }),
    });

    const createRes = await postApps(createReq);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    expect(created.app.has_credentials).toBe(true);
    expect(created.app.metadataJson.credentials_encrypted).toBeUndefined();

    const dbApp = await prisma.app.findUniqueOrThrow({ where: { id: created.app.id } });
    const metadata = (dbApp.metadataJson ?? {}) as Record<string, unknown>;
    expect(typeof metadata.credentials_encrypted).toBe("object");

    const rotateRes = await rotateCredentials(
      new Request("http://localhost:3000/api/apps/x/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: {
            auth_token: "sk_test_rotated_secret",
          },
        }),
      }),
      { params: Promise.resolve({ id: created.app.id }) },
    );

    expect(rotateRes.status).toBe(200);
    const rotateBody = await rotateRes.json();
    expect(rotateBody.credentials_stored).toBe(true);
    expect(rotateBody.has_credentials).toBe(true);

    const revokeRes = await revokeCredentials(new Request("http://localhost:3000/api/apps/x/credentials", { method: "DELETE" }), {
      params: Promise.resolve({ id: created.app.id }),
    });
    expect(revokeRes.status).toBe(200);

    const revokeBody = await revokeRes.json();
    expect(revokeBody.credentials_removed).toBe(true);
    expect(revokeBody.has_credentials).toBe(false);

    const dbAfter = await prisma.app.findUniqueOrThrow({ where: { id: created.app.id } });
    const metadataAfter = (dbAfter.metadataJson ?? {}) as Record<string, unknown>;
    expect(metadataAfter.credentials_encrypted).toBeUndefined();
  });
});
