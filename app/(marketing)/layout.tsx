import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-main min-h-screen">
      <header className="border-b border-white/10 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lime-200">Callable</Link>
          <Link href="/dashboard" className="text-sm text-[var(--muted-text)] hover:text-white">Open local workspace</Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-white/10 px-4 py-6 text-center text-sm text-[var(--muted-text)]">Open-source command infrastructure for controlled business workflows.</footer>
    </div>
  );
}
