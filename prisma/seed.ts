import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organisation = await prisma.organisation.upsert({
    where: { slug: "acme-dev" },
    update: {},
    create: {
      name: "Acme Dev Org",
      slug: "acme-dev",
      plan: "dev",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "dev@acme.local" },
    update: {},
    create: {
      organisationId: organisation.id,
      email: "dev@acme.local",
      name: "Dev Operator",
      role: "admin",
    },
  });

  const customerA = await prisma.customer.upsert({
    where: { externalId: "CUST-1001" },
    update: {},
    create: {
      organisationId: organisation.id,
      externalId: "CUST-1001",
      name: "Jordan Miles",
      email: "jordan@example.com",
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { externalId: "CUST-1002" },
    update: {},
    create: {
      organisationId: organisation.id,
      externalId: "CUST-1002",
      name: "Riley Chen",
      email: "riley@example.com",
    },
  });

  await prisma.ticket.upsert({
    where: { ticketCode: "TCK-1001" },
    update: {},
    create: {
      organisationId: organisation.id,
      customerId: customerA.id,
      ticketCode: "TCK-1001",
      subject: "Duplicate billing on monthly plan",
      description: "Customer reports duplicate billing for April invoice.",
      status: "open",
      refundEligible: true,
    },
  });

  await prisma.ticket.upsert({
    where: { ticketCode: "TCK-1002" },
    update: {},
    create: {
      organisationId: organisation.id,
      customerId: customerB.id,
      ticketCode: "TCK-1002",
      subject: "Refund request after cancellation",
      description: "Customer cancelled in trial period and requests full refund.",
      status: "open",
      refundEligible: true,
    },
  });

  const appExists = await prisma.app.findFirst({
    where: { organisationId: organisation.id, name: "Acme Support Admin" },
  });

  if (!appExists) {
    await prisma.app.create({
      data: {
        organisationId: organisation.id,
        name: "Acme Support Admin",
        type: "internal_web_app",
        baseUrl: "http://localhost:3100",
        authMethod: "none",
        connectionStatus: "not_connected",
        executionMode: "hybrid",
      },
    });
  } else {
    await prisma.app.update({
      where: { id: appExists.id },
      data: { baseUrl: "http://localhost:3100" },
    });
  }

  console.log(`Seed complete for org ${organisation.slug}, user ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
