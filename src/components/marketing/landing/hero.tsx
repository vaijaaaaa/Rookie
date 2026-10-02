import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroTerminal } from "./hero-terminal";

export function Hero({ homeHref }: { homeHref: string | null }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* faint grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            CS fundamentals, structured
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]"
          >
            Learn Computer Science.
            <br />
            <span className="text-brand">Build Real Skills.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Roadmaps that tell you what to learn next, live classes that explain it, lessons you can return to,
            and coding problems that make it stick — wired together into one daily loop.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {homeHref ? (
              <Button asChild size="lg" variant="brand">
                <Link href={homeHref}>
                  Open your dashboard <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="brand">
                <Link href="/login">
                  Log in to start <ArrowRight />
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link href="/roadmaps">Browse roadmaps</Link>
            </Button>
          </div>
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            <span className="text-brand">$</span> no credit card · java · python · javascript
          </p>
        </div>
        <HeroTerminal />
      </div>
    </section>
  );
}
