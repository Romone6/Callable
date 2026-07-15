import { prisma } from "@/lib/db";
import { getDevContext } from "@/lib/auth";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

export default async function AcmeCustomersPage() {
  const { organisationId } = await getDevContext();
  const customers = await prisma.customer.findMany({ where: { organisationId }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <Breadcrumbs current="Acme Customers" />
      <PageHeader label="Acme Support Admin" title="Customer records" description="Real relational records used by ticket and refund workflows." />
      <Card>
        {customers.length === 0 ? (
          <EmptyState title="No customers" description="Seed development data to populate customers." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Name</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">Email</th>
                <th className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">External ID</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="border-b border-white/10 px-2 py-3">{customer.name}</td>
                  <td className="border-b border-white/10 px-2 py-3">{customer.email}</td>
                  <td className="border-b border-white/10 px-2 py-3">{customer.externalId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

