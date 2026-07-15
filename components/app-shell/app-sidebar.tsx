"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { workspaceNav } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-24 h-fit rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-lime)]">Workspace</p>
      <h2 className="mt-2 text-lg font-semibold">Command Control Plane</h2>
      <nav className="mt-4 grid gap-1">
        {workspaceNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm text-[var(--muted-text)] transition",
              pathname === item.href ? "bg-lime-300/15 text-lime-200" : "hover:bg-white/5 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

