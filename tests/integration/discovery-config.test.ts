import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as runDiscovery } from "@/app/api/discovery/run/route";

const prisma = new PrismaClient();
let sourceId = "";

beforeAll(async () => {
  const user = await prisma.user.findFirstOrThrow();
  const source = await prisma.discoverySource.create({
    data: {
      organisationId: user.organisationId,
      type: "manual_process_text",
      name: `missing-key-source-${Date.now()}`,
      rawText: "Issue refund from ticket when duplicate billing is confirmed",
      parsedJson: { text: "refund flow" },
      status: "parsed",
    },
  });
  sourceId = source.id;
});

describe("discovery api", () => {
  it("returns configuration error when OPENAI_API_KEY is missing", async () => {
    const req = new Request("http://localhost:3000/api/discovery/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_ids: [sourceId] }),
    });

    const res = await runDiscovery(req);
    const body = await res.json();

    if (!process.env.OPENAI_API_KEY) {
      expect(res.status).toBe(400);
      expect(String(body?.error?.details ?? "").toLowerCase()).toContain("openai_api_key");
    } else {
      expect([200, 400]).toContain(res.status);
    }
  });
});
