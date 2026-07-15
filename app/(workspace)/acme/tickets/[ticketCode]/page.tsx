import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { issueRefundFromTicket } from "@/lib/acme";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function submitRefund(formData: FormData) {
  "use server";
  const { organisationId } = await getDevContext();
  const ticketCode = String(formData.get("ticket_code"));
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason"));

  await issueRefundFromTicket({
    organisationId,
    ticketId: ticketCode,
    amount,
    reason,
  });

  revalidatePath(`/acme/tickets/${ticketCode}`);
  revalidatePath("/acme/tickets");
}

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketCode: string }> }) {
  const { organisationId } = await getDevContext();
  const { ticketCode } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { organisationId, ticketCode },
    include: { customer: true, refunds: { orderBy: { createdAt: "desc" } } },
  });

  if (!ticket) {
    return (
      <>
        <Breadcrumbs current="Acme Tickets" />
        <Card>Ticket not found.</Card>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs current={`Acme Tickets / ${ticket.ticketCode}`} />
      <PageHeader label="Acme Support Admin" title={`Ticket ${ticket.ticketCode}`} description={ticket.subject} />
      <Card>
        <div className="grid gap-2 text-sm">
          <p><strong>Status:</strong> <span data-testid="ticket-status">{ticket.status}</span></p>
          <p><strong>Customer:</strong> {ticket.customer.name} ({ticket.customer.email})</p>
          <p><strong>Description:</strong> {ticket.description}</p>
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold">Issue refund</h3>
        <form action={submitRefund} className="mt-3 grid gap-3">
          <input type="hidden" name="ticket_code" value={ticket.ticketCode} />
          <Input data-testid="refund-amount" name="amount" type="number" step="0.01" defaultValue="25" required />
          <Input data-testid="refund-reason" name="reason" defaultValue="duplicate billing" required />
          <Button data-testid="refund-submit" type="submit">Issue refund</Button>
        </form>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold">Refund history</h3>
        {ticket.refunds.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-text)]">No refunds yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {ticket.refunds.map((refund) => (
              <li key={refund.id}>
                <span data-testid="refund-confirmation" className="font-semibold text-lime-200">{refund.confirmationId}</span> · ${refund.amount.toString()} · {refund.reason}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

