import { createHash, randomUUID } from "node:crypto";
import { ActorType, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";

const prisma = new PrismaClient();

let organisationId = "";
let apiKeyId = "";
let apiToken = "";
const createdAuditIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No development user found. Run seed first.");
  }
  organisationId = user.organisationId;

  apiToken = `vk_test_${randomUUID().replace(/-/g, "")}`;
  const key = await prisma.apiKey.create({
    data: {
      organisationId,
      name: `audit-events-test-${Date.now()}`,
      keyHash: createHash("sha256").update(apiToken).digest("hex"),
      scopesJson: ["audit:read"],
    },
  });
  apiKeyId = key.id;
});

afterAll(async () => {
  if (createdAuditIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { id: { in: createdAuditIds } } });
  }
  if (apiKeyId) {
    await prisma.apiKey.deleteMany({ where: { id: apiKeyId } });
  }
  await prisma.$disconnect();
});

describe("audit events API", () => {
  it("rejects unauthenticated callers", async () => {
    const res = await getAuditEvents(new Request("http://localhost:3100/api/audit/events"));
    expect([401, 403]).toContain(res.status);
  });

  it("validates actor_type filter", async () => {
    const res = await getAuditEvents(
      new Request("http://localhost:3100/api/audit/events?actor_type=invalid-role", {
        headers: { Authorization: `Bearer ${apiToken}` },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("bad_request");
  });

  it("returns filtered, paginated events", async () => {
    const suffix = randomUUID().slice(0, 8);
    const eventType = `audit_events_test_${suffix}`;
    const actorId = `actor_${suffix}`;

    const timestamps = [
      new Date("2026-05-18T00:00:01.000Z"),
      new Date("2026-05-18T00:00:02.000Z"),
      new Date("2026-05-18T00:00:03.000Z"),
    ];

    for (const timestamp of timestamps) {
      const log = await prisma.auditLog.create({
        data: {
          organisationId,
          eventType,
          actorType: ActorType.agent,
          actorId,
          detailsJson: {
            scope: "enterprise",
            sequence_at: timestamp.toISOString(),
          },
          createdAt: timestamp,
        },
      });
      createdAuditIds.push(log.id);
    }

    const pageOne = await getAuditEvents(
      new Request(`http://localhost:3100/api/audit/events?event_type=${eventType}&actor_type=agent&actor_id=${actorId}&limit=2`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      }),
    );

    expect(pageOne.status).toBe(200);
    const pageOneBody = await pageOne.json();
    expect(pageOneBody.events).toHaveLength(2);
    expect(pageOneBody.page.has_more).toBe(true);
    expect(typeof pageOneBody.page.next_before).toBe("string");
    expect(pageOneBody.events[0].event_type).toBe(eventType);
    expect(pageOneBody.events[0].actor_type).toBe("agent");
    expect(pageOneBody.events[0].actor_id).toBe(actorId);
    expect(pageOneBody.events[0].created_at).toBe("2026-05-18T00:00:03.000Z");

    const nextBefore = pageOneBody.page.next_before as string;
    const pageTwo = await getAuditEvents(
      new Request(`http://localhost:3100/api/audit/events?event_type=${eventType}&actor_type=agent&actor_id=${actorId}&limit=2&before=${encodeURIComponent(nextBefore)}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      }),
    );

    expect(pageTwo.status).toBe(200);
    const pageTwoBody = await pageTwo.json();
    expect(pageTwoBody.events).toHaveLength(1);
    expect(pageTwoBody.page.has_more).toBe(false);
    expect(pageTwoBody.events[0].created_at).toBe("2026-05-18T00:00:01.000Z");
  });
});
