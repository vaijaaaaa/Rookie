import { cn } from "@/lib/utils";

/** Eyebrow + title + lede used by every landing section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-brand">{eyebrow}</p>
        <h2 id={id} className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Full-width band with a top border and consistent container. */
export function LandingSection({
  children,
  labelledBy,
  className,
}: {
  children: React.ReactNode;
  labelledBy: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn("border-t", className)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">{children}</div>
    </section>
  );
}
