import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "Rookie exists to help people learn computer science systematically — fundamentals first.",
};

const PRINCIPLES = [
  {
    title: "Fundamentals first",
    body: "Data structures, algorithms, operating systems, networks and databases are the parts of CS that don't expire. We teach those before anything trendy.",
  },
  {
    title: "Structure over content volume",
    body: "The internet already has endless tutorials. What's missing is an order to learn them in and a way to know you're done. Roadmaps provide both.",
  },
  {
    title: "Practice is the product",
    body: "Reading about recursion isn't the same as writing it. Every topic leads to problems and assignments that make you apply it.",
  },
  {
    title: "Small daily progress",
    body: "An hour a day beats a weekend binge. The daily agenda and streaks are built to make consistency the default.",
  },
  {
    title: "Teachers, not just videos",
    body: "Live classes put a real instructor in front of real questions. Recordings and notes keep the material available afterwards.",
  },
  {
    title: "Honest progress",
    body: "Progress comes from what you actually completed — lessons, problems, attendance — never from vanity metrics.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-brand">About</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          We want more people to actually understand computers.
        </h1>
        <div className="mt-6 space-y-4 text-muted-foreground sm:text-lg">
          <p>
            Most people learning to code are told to pick a framework and start building. That works — until it
            doesn&apos;t. The first time something is slow, or breaks under load, or an interviewer asks how a hash map
            works, the gaps show.
          </p>
          <p>
            Rookie is a learning platform for computer science fundamentals. It combines roadmaps, live classes,
            written lessons, coding practice and a daily agenda into one system, so that learning CS feels less like
            collecting bookmarks and more like following a curriculum.
          </p>
        </div>
      </header>

      <section aria-labelledby="mission-title" className="mt-14 rounded-lg border bg-card p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Mission</p>
        <h2 id="mission-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          Make a rigorous computer science education structured, practical and available to anyone willing to show
          up every day.
        </h2>
      </section>

      <section aria-labelledby="principles-title" className="mt-14">
        <h2 id="principles-title" className="text-xl font-semibold tracking-tight">
          What we believe
        </h2>
        <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title} className="bg-card p-5">
              <p className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-medium">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="who-title" className="mt-14 grid gap-6 sm:grid-cols-3">
        <h2 id="who-title" className="sr-only">
          Who Rookie is for
        </h2>
        {[
          { k: "students", v: "Self-taught learners and CS students who want a clear path through the core." },
          { k: "instructors", v: "Teachers who want to run classes, assignments and attendance in one place." },
          { k: "teams", v: "Bootcamps and companies running cohorts that need visibility into progress." },
        ].map((x) => (
          <div key={x.k}>
            <p className="font-mono text-[11px] uppercase tracking-wider text-brand">for {x.k}</p>
            <p className="mt-2 text-sm text-muted-foreground">{x.v}</p>
          </div>
        ))}
      </section>

      <div className="mt-16 flex flex-wrap gap-3 border-t pt-10">
        <Button asChild variant="brand">
          <Link href="/login">
            Start learning <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/roadmaps">Explore roadmaps</Link>
        </Button>
      </div>
    </div>
  );
}
