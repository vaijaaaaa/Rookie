import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden border-t">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_50%_60%_at_50%_50%,black,transparent)]"
      />
      <div className="landing-reveal relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:py-32">
        <p className="font-mono text-[11px] tracking-wider text-brand uppercase">$ rookie init</p>
        <h2 id="cta-title" className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Fundamentals first. Everything else follows.
        </h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          Log in with the account your admin created and get your first daily agenda in minutes.
        </p>
        <Button asChild size="lg" className="mt-8 h-11 rounded-full px-6 shadow-lg shadow-black/10">
          <Link href="/login">
            Get started <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
