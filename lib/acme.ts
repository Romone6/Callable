import { prisma } from "@/lib/db";

export async function issueRefundFromTicket(params: {
  organisationId: string;
  ticketId: string;
  amount: number;
  reason: string;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      organisationId: params.organisationId,
      ticketCode: params.ticketId,
    },
    include: { customer: true },
  });

  if (!ticket) {
    throw new Error(`Ticket ${params.ticketId} not found`);
  }

  if (!ticket.refundEligible) {
    throw new Error(`Ticket ${params.ticketId} is not eligible for refunds`);
  }

  const confirmationId = `RF-${Date.now()}`;

  const refund = await prisma.refund.create({
    data: {
      organisationId: params.organisationId,
      customerId: ticket.customerId,
      ticketId: ticket.id,
      amount: params.amount,
      reason: params.reason,
      confirmationId,
    },
  });

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "refund_issued" },
  });

  return {
    refund_id: refund.confirmationId,
    status: "succeeded",
    ticket_status: updatedTicket.status,
  };
}

