"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accordion with animated height (grid 0fr → 1fr), fading answer and rotating icon. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map(({ q, a }, i) => {
        const isOpen = open === i;
        const btnId = `${uid}-q${i}`;
        const panelId = `${uid}-a${i}`;
        return (
          <div
            key={q}
            className={cn(
              "landing-reveal relative transition-colors duration-300",
              isOpen ? "bg-accent/40" : "hover:bg-accent/20",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 w-0.5 origin-top bg-brand transition-transform duration-500 ease-out",
                isOpen ? "scale-y-100" : "scale-y-0",
              )}
            />
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
              >
                <span className={cn("transition-transform duration-300", isOpen ? "translate-x-1" : "group-hover:translate-x-1")}>
                  {q}
                </span>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-out",
                    isOpen ? "rotate-[135deg] border-brand/50 bg-brand text-brand-foreground" : "text-muted-foreground group-hover:border-foreground/30",
                  )}
                >
                  <Plus className="size-3.5" aria-hidden />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden" inert={!isOpen}>
                <p
                  className={cn(
                    "px-5 pb-5 pl-6 text-sm leading-relaxed text-muted-foreground transition-all duration-500 ease-out motion-reduce:transition-none",
                    isOpen ? "translate-y-0 opacity-100 blur-0 delay-100" : "-translate-y-2 opacity-0 blur-[2px]",
                  )}
                >
                  {a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
