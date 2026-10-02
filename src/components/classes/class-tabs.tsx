import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LinkTab {
  value: string;
  label: string;
  href: string;
  count?: number;
}

/** URL-driven tab bar (server rendered, works without JS). */
export function LinkTabs({ tabs, active, label }: { tabs: LinkTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex h-9 w-max items-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map((t) => {
          const isActive = t.value === active;
          return (
            <li key={t.value} className="h-full">
              <Link
                href={t.href}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive && "bg-background text-foreground shadow-sm dark:bg-accent",
                )}
              >
                {t.label}
                {t.count !== undefined ? (
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{t.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
