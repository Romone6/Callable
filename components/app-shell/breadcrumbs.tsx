export function Breadcrumbs({ current }: { current: string }) {
  return (
    <div className="mb-3 text-xs uppercase tracking-[0.1em] text-[var(--muted-text)]">
      Workspace / {current}
    </div>
  );
}

