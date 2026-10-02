import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroHeadline } from "./hero-headline";

type FloatStyle = React.CSSProperties & { "--tilt"?: string; "--delay"?: string; "--dur"?: string };

/** Decorative card that eases in, then drifts slowly. Desktop only. */
function FloatCard({ className, style, children }: { className?: string; style: FloatStyle; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "landing-float absolute hidden rounded-xl border bg-card/90 p-4 shadow-xl shadow-black/[0.06] backdrop-blur-sm xl:block dark:shadow-black/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

const eyebrow = "font-mono text-[10px] uppercase tracking-wider text-muted-foreground";

function FloatingCards() {
  return (
    <>
      <FloatCard className="top-16 left-[3%] w-56" style={{ "--tilt": "-6deg", "--delay": "350ms", "--dur": "10s" }}>
        <p className={eyebrow}>Lesson · 047</p>
        <p className="mt-2 text-sm leading-snug font-semibold">Big-O: amortized analysis</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Why appending to a dynamic array is O(1) on average, even though it sometimes copies everything.
        </p>
      </FloatCard>

      <FloatCard className="top-24 right-[3%] w-60" style={{ "--tilt": "5deg", "--delay": "550ms", "--dur": "11s" }}>
        <div className="flex items-center justify-between">
          <p className={eyebrow}>Solution.java</p>
          <span className="rounded border border-success/40 px-1 font-mono text-[10px] text-success">ACCEPTED</span>
        </div>
        <pre className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-info">for</span> (<span className="text-info">char</span> c : s) {"{"}
          {"\n"}  <span className="text-info">if</span> (open(c)) stack.push(c);
          {"\n"}  <span className="text-info">else</span> match(stack.pop(), c);
          {"\n"}
          {"}"}
        </pre>
        <p className="mt-2 flex items-center gap-1 font-mono text-[11px] text-success">
          <Check className="size-3" /> 12/12 tests passed
        </p>
      </FloatCard>

      <FloatCard
        className="top-[17rem] right-[2%] w-max rounded-full border-transparent bg-foreground px-4 py-2.5 text-background"
        style={{ "--tilt": "-2deg", "--delay": "800ms", "--dur": "8s" }}
      >
        <div className="flex items-center gap-3 whitespace-nowrap">
        <span className="rounded-full bg-background/15 px-2 py-0.5 font-mono text-[10px] uppercase">Streak</span>
        <span className="flex gap-0.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className={cn("h-3 w-1.5 rounded-sm", i < 5 ? "bg-brand" : "bg-background/25")} />
          ))}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">5 days</span>
        </div>
      </FloatCard>

      <FloatCard className="bottom-10 left-[5%] w-60" style={{ "--tilt": "4deg", "--delay": "700ms", "--dur": "12s" }}>
        <p className={eyebrow}>Data structures · 4 / 9</p>
        <ol className="mt-3 space-y-1.5 border-l pl-3 text-xs">
          {["Arrays & strings", "Linked lists", "Stacks & queues", "Trees"].map((t, i) => (
            <li key={t} className="relative flex items-center gap-2">
              <span
                className={cn(
                  "absolute -left-[17px] size-2 rounded-full border",
                  i < 3 ? "border-brand bg-brand" : "border-brand bg-card",
                )}
              />
              <span className={i < 3 ? "text-muted-foreground line-through decoration-muted-foreground/40" : "font-medium"}>{t}</span>
              {i === 3 ? <span className="font-mono text-[9px] text-brand uppercase">← now</span> : null}
            </li>
          ))}
        </ol>
      </FloatCard>

      <FloatCard className="right-[6%] bottom-6 w-56" style={{ "--tilt": "-4deg", "--delay": "950ms", "--dur": "10s" }}>
        <p className={eyebrow}>Today · 3 of 4 done</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="landing-bar h-full w-3/4 rounded-full bg-brand" style={{ "--delay": "1.6s" } as FloatStyle} />
        </div>
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
          <li>✓ live class · recursion</li>
          <li>✓ lesson · call stack</li>
          <li>✓ problem · fib-memo</li>
          <li className="text-foreground">○ review · notes</li>
        </ul>
      </FloatCard>
    </>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_45%,black,transparent)]"
      />
      <FloatingCards />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-24 text-center sm:pt-28 lg:min-h-[640px] lg:justify-center lg:pt-16 lg:pb-16">
        <Link
          href="/login"
          className="landing-enter group inline-flex items-center gap-2 rounded-full border bg-card px-1.5 py-1 pr-3 text-xs shadow-sm transition-colors hover:border-brand/40"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand uppercase">
            <span className="landing-live-dot size-1.5 rounded-full bg-brand" />
            New
          </span>
          <span className="text-muted-foreground">Java fundamentals track is live</span>
          <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="landing-enter mt-7" style={{ "--delay": "80ms" } as FloatStyle}>
          <HeroHeadline />
        </div>

        <p
          className="landing-enter mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
          style={{ "--delay": "160ms" } as FloatStyle}
        >
          Data structures, algorithms, operating systems and more — taught in live classes, written lessons and
          coding problems, sequenced into one daily loop.
        </p>

        <div className="landing-enter mt-9 flex flex-wrap items-center justify-center gap-3" style={{ "--delay": "240ms" } as FloatStyle}>
          <Button asChild size="lg" className="h-11 rounded-full px-6 shadow-lg shadow-black/10">
            <Link href="/login">
              Start learning <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-5 text-muted-foreground">
            <Link href="#inside">See what&apos;s inside</Link>
          </Button>
        </div>
        <p className="landing-enter mt-5 font-mono text-[11px] text-muted-foreground" style={{ "--delay": "320ms" } as FloatStyle}>
          java · python · javascript — in your browser
        </p>
      </div>
    </section>
  );
}
