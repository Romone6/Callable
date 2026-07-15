"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="hero-orbit pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-lime)]">Agent-native command layer</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Make every business dashboard <span className="text-[var(--accent-lime)]">agent-callable.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--muted-text)]">
            VerblLayer discovers workflows in your existing tools, turns them into governed commands, and lets AI agents execute through APIs or real browser automation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open Workspace <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/docs">Review API Contracts</Link>
            </Button>
          </div>
        </div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-dark)]/90 p-6 shadow-[var(--shadow-glow)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">issue_refund_from_ticket</h3>
            <Badge variant="success">Published</Badge>
          </div>
          <p className="text-sm text-[var(--muted-text)]">Issues a customer refund from a support ticket and updates ticket status.</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div><span className="text-[var(--muted-text)]">Inputs:</span> ticket_id, amount, reason</div>
            <div><span className="text-[var(--muted-text)]">Outputs:</span> refund_id, ticket_status, status</div>
            <div><span className="text-[var(--muted-text)]">Approval:</span> required if amount {'>'} $200</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
