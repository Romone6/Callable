import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { issueRefundFromTicket } from "@/lib/acme";

const prisma = new PrismaClient();
let organisationId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const org = await prisma.organisation.create({
    data: {
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}`,
      plan: "test",
    },
  });
  organisationId = org.id;

  const customer = await prisma.customer.create({
    data: {
      organisationId,
      externalId: `C-${suffix}`,
      email: `customer-${suffix}@example.com`,
      name: "Customer Test",
    },
  });

  await prisma.ticket.create({
    data: {
      organisationId,
      customerId: customer.id,
      ticketCode: `TCK-${suffix}`,
      subject: "Duplicate charge",
      description: "Please refund",
      status: "open",
      refundEligible: true,
    },
  });
});

afterAll(async () => {
  await prisma.refund.deleteMany({ where: { organisationId } });
  await prisma.ticket.deleteMany({ where: { organisationId } });
  await prisma.customer.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.app.deleteMany({ where: { organisationId } });
  await prisma.organisation.deleteMany({ where: { id: organisationId } });
  await prisma.$disconnect();
});

describe("acme refund execution", () => {
  it("creates refund and updates ticket status", async () => {
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { organisationId } });

    const result = await issueRefundFromTicket({
      organisationId,
      ticketId: ticket.ticketCode,
      amount: 50,
      reason: "duplicate billing",
    });

    expect(result.status).toBe("succeeded");
    expect(result.refund_id.startsWith("RF-")).toBe(true);
    expect(result.ticket_status).toBe("refund_issued");

    const refunds = await prisma.refund.findMany({ where: { organisationId, ticketId: ticket.id } });
    expect(refunds.length).toBe(1);
  });
});
