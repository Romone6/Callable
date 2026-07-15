import Link from "next/link";
import { Bell, Building2, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WorkspaceSwitcher() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
      <Building2 size={14} className="text-[var(--accent-lime)]" aria-hidden="true" />
      <span className="text-sm">Default Workspace</span>
    </div>
  );
}

export function UserMenu() {
  return (
    <div className="flex items-center gap-3">
      <button
        className="rounded-lg border border-white/10 bg-black/25 p-2 text-[var(--muted-text)] transition hover:text-white focus-visible:text-white"
        type="button"
        aria-label="Open notifications"
      >
        <Bell size={14} aria-hidden="true" />
      </button>
      <Badge variant="neutral">Owner</Badge>
    </div>
  );
}

export function AppTopbar() {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-4">
      <WorkspaceSwitcher />
      <div className="flex items-center gap-2">
        <Link href="/api/health" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-lime)] bg-lime-300/10 px-2.5 py-1.5 text-xs text-lime-200 transition hover:bg-lime-300/20">
          <Server size={12} aria-hidden="true" />
          API Health
        </Link>
        <UserMenu />
      </div>
    </div>
  );
}
