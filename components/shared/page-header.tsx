import { SectionLabel } from "@/components/shared/section-label";

export function PageHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-6">
      <SectionLabel>{label}</SectionLabel>
      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{title}</h1>
      {description ? <p className="mt-2 text-sm text-[var(--muted-text)] md:text-base">{description}</p> : null}
    </div>
  );
}

