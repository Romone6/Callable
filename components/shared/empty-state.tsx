import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Card className="text-center">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted-text)]">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="mt-4 inline-block">
          <Button>{ctaLabel}</Button>
        </Link>
      ) : null}
    </Card>
  );
}

