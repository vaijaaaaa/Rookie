import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Titled dashboard panel with optional "view all" link. */
export function Section({
  title,
  href,
  hrefLabel = "View all",
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action ??
          (href ? (
            <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {hrefLabel} <ArrowRight className="size-3" />
            </Link>
          ) : null)}
      </header>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}
