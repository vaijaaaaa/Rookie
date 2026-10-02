import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCta({ homeHref }: { homeHref: string | null }) {
  return (
    <section aria-labelledby="cta-title" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex flex-col items-start gap-6 rounded-lg border bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-brand">$ rookie init</p>
            <h2 id="cta-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Start with the fundamentals today.
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Create an account, pick a goal, and get a roadmap plus your first daily agenda in under two minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {homeHref ? (
              <Button asChild size="lg" variant="brand">
                <Link href={homeHref}>
                  Go to dashboard <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" variant="brand">
                  <Link href="/signup">
                    Create free account <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
