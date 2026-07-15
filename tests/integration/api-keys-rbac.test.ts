import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getDevContext: vi.fn(),
}));

import { getDevContext } from "@/lib/auth";
import { GET, POST } from "@/app/api/api-keys/route";

describe("api keys rbac", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks viewer from creating API keys", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const res = await POST(
      new Request("http://localhost/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "blocked" }),
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(String(body.error?.message ?? "").toLowerCase()).toContain("forbidden");
  });

  it("blocks viewer from listing API keys", async () => {
    vi.mocked(getDevContext).mockResolvedValue({
      organisationId: "org_1",
      userId: "user_1",
      user: {
        id: "user_1",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
      },
    });

    const res = await GET();
    expect(res.status).toBe(403);
  });
});
