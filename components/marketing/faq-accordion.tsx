"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export function FAQAccordion({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <Accordion.Root type="single" collapsible className="space-y-2">
      {items.map((item, index) => (
        <Accordion.Item key={item.question} value={`item-${index}`} className="rounded-xl border border-white/15 bg-black/20">
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
              {item.question}
              <ChevronDown className="h-4 w-4" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-4 text-sm text-[var(--muted-text)]">{item.answer}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

