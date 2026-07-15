import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PricingCard({
  plan,
  price,
  items,
  featured,
}: {
  plan: string;
  price: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <Card className={featured ? "border-lime-300/60" : ""}>
      <h3 className="text-3xl font-semibold">{plan}</h3>
      <p className="mt-2 text-4xl font-semibold text-[var(--accent-lime)]">{price}</p>
      <ul className="mt-5 flex flex-col gap-2 text-sm text-[var(--muted-text)]">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2"><Check size={14} className="text-[var(--accent-lime)]" aria-hidden="true" /> {item}</li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-full" variant={featured ? "default" : "secondary"}>
        <Link href="/dashboard">Get Started</Link>
      </Button>
    </Card>
  );
}
