import Link from "next/link";
import { cn } from "@/lib/utils";

/** URL-driven tabs (server-rendered). */
export function LinkTabs({
  tabs,
  active,
  className,
}: {
  tabs: { value: string; label: React.ReactNode; href: string; count?: number }[];
  active: string;
  className?: string;
}) {
  return (
    <nav className={cn("inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={t.value === active ? "page" : undefined}
          className={cn(
            "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            t.value === active && "bg-background text-foreground shadow-sm dark:bg-accent",
          )}
        >
          {t.label}
          {t.count !== undefined ? <span className="font-mono text-[11px] text-muted-foreground">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
