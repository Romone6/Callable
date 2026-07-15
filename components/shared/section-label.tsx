import { cn } from "@/lib/utils/cn";

export function SectionLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--border-lime)] bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-200",
        className,
      )}
      {...props}
    />
  );
}

