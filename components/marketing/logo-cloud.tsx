const connectorCoverage = [
  "Acme Support Admin",
  "Custom Web App",
  "API Schema Target",
  "Uploaded Workflow Evidence",
  "Stripe",
  "Zendesk",
  "HubSpot",
  "Salesforce",
  "NetSuite",
  "Jira",
];

export function LogoCloud() {
  return (
    <section className="bg-[var(--cream)] py-12 text-[var(--ink)]">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <p className="text-center text-sm uppercase tracking-[0.12em] text-[#51655d]">Connector coverage across available and in-development providers</p>
        <div className="mt-6 grid grid-cols-2 gap-4 text-center text-lg font-semibold md:grid-cols-5 md:text-2xl">
          {connectorCoverage.map((connector) => (
            <div key={connector} className="rounded-xl border border-[#d8dfd7] bg-[#f4f6ee] px-3 py-4">
              {connector}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
