import Link from "next/link";
import { Layers3 } from "lucide-react";
import { marketingNav } from "@/lib/constants/navigation";
import { AuthNav } from "@/components/auth-nav";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--background-deeper)]/85 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-white transition hover:text-lime-100 focus-visible:text-lime-100" aria-label="VerblLayer home">
          <Layers3 className="text-[var(--accent-lime)]" aria-hidden="true" />
          VerblLayer
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-[var(--muted-text)] lg:flex" aria-label="Primary">
          {marketingNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white focus-visible:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {env.AUTH_MODE === "clerk" ? (
            <AuthNav />
          ) : (
            <Button asChild size="sm">
              <Link href="/dashboard">Open App</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
