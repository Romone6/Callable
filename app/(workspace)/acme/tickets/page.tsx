import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";

export default async function AcmeTicketsPage() {
  const { organisationId } = await getDevContext();
  const tickets = await prisma.ticket.findMany({
    where: { organisationId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Breadcrumbs current="Acme Tickets" />
      <PageHeader label="Acme Support Admin" title="Ticket list" description="Real target app workflow used by the execution engine." />
      <Card>
        {tickets.length === 0 ? (
          <EmptyState title="No tickets" description="Seed development data to use refund workflows." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Ticket</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Customer</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Status</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Refund eligible</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} data-testid="ticket-row">
                  <td className="border-b border-white/10 px-2 py-3"><Link href={`/acme/tickets/${ticket.ticketCode}`} className="text-lime-200 hover:underline">{ticket.ticketCode}</Link></td>
                  <td className="border-b border-white/10 px-2 py-3">{ticket.customer.email}</td>
                  <td className="border-b border-white/10 px-2 py-3"><StatusBadge value={ticket.status} /></td>
                  <td className="border-b border-white/10 px-2 py-3">{ticket.refundEligible ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

