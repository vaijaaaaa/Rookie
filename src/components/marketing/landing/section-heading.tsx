import { cn } from "@/lib/utils";

/** Eyebrow + title + lede used by every landing section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className,
  center,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
  className?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("landing-reveal mb-10 max-w-2xl", center && "mx-auto text-center", className)}>
      <p className="mb-3 font-mono text-[11px] tracking-wider text-brand uppercase">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
        {title}
      </h2>
      {description ? <p className="mt-3 text-base text-muted-foreground">{description}</p> : null}
    </div>
  );
}

/** Full-width band with a consistent container. */
export function LandingSection({
  children,
  labelledBy,
  className,
  id,
}: {
  children: React.ReactNode;
  labelledBy: string;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-16", className)}>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">{children}</div>
    </section>
  );
}
