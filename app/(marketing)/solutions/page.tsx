"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import { SectionLabel } from "@/components/shared/section-label";
import { Card } from "@/components/ui/card";

const solutions = {
  support: {
    label: "Support Operations",
    problem: "High-volume ticket handling with refund and escalation edge cases.",
    commands: ["issue_refund_from_ticket", "close_support_ticket", "escalate_billing_ticket", "sync_ticket_to_crm"],
    outcome: "Faster resolution while preserving approvals and audit traceability.",
  },
  finance: {
    label: "Finance Operations",
    problem: "Approvals, reconciliation, and payment actions across fragmented systems.",
    commands: ["approve_credit_note", "apply_refund_policy", "reconcile_invoice_status"],
    outcome: "Controlled execution for high-risk financial operations.",
  },
  revops: {
    label: "RevOps",
    problem: "Manual sync between CRM, support, and billing workflows.",
    commands: ["sync_deal_fields", "create_account_workflow", "enforce_quote_checks"],
    outcome: "Consistent multi-system updates with governance checks.",
  },
};

export default function SolutionsPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <section className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-8">
        <SectionLabel>Solutions</SectionLabel>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">Operational workflows, made agent-executable.</h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted-text)]">VerblLayer adapts to your workflows and existing systems using command contracts and governed execution rules.</p>
      </section>
      <Tabs.Root defaultValue="support" className="mt-8">
        <Tabs.List className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
          {Object.entries(solutions).map(([key, solution]) => (
            <Tabs.Trigger key={key} value={key} className="rounded-xl px-3 py-2 text-sm data-[state=active]:bg-lime-300/15 data-[state=active]:text-lime-200">
              {solution.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {Object.entries(solutions).map(([key, solution]) => (
          <Tabs.Content key={key} value={key} asChild>
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} className="mt-4 grid gap-4 md:grid-cols-3">
              <Card>
                <h3 className="text-xl font-semibold">Problem</h3>
                <p className="mt-2 text-sm text-[var(--muted-text)]">{solution.problem}</p>
              </Card>
              <Card>
                <h3 className="text-xl font-semibold">Suggested commands</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm text-[var(--muted-text)]">
                  {solution.commands.map((command) => <li key={command}>{command}</li>)}
                </ul>
              </Card>
              <Card>
                <h3 className="text-xl font-semibold">Outcome</h3>
                <p className="mt-2 text-sm text-[var(--muted-text)]">{solution.outcome}</p>
              </Card>
            </motion.div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </main>
  );
}
