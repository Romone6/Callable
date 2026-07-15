import Link from "next/link";
import { Layers3 } from "lucide-react";
import { marketingNav } from "@/lib/constants/navigation";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--background-deeper)] py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 md:grid-cols-2 md:px-6">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Layers3 className="text-[var(--accent-lime)]" /> VerblLayer
          </div>
          <p className="mt-2 max-w-md text-sm text-[var(--muted-text)]">
            Agent-native command layer for existing business software.
          </p>
          <p className="mt-4 text-xs text-[var(--muted-text)]">© 2026 VerblLayer Inc. All rights reserved.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-[var(--muted-text)]">
          {marketingNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}

