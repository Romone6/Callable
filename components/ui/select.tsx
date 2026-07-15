import { cn } from "@/lib/utils/cn";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

