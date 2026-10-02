import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LandingSection, SectionHeading } from "./section-heading";

const PATHS = [
  {
    kind: "Foundations path",
    title: "Software developer",
    points: ["Programming from first principles", "Data structures & algorithms", "OOP and clean code"],
    meta: "dsa · oop · git",
  },
  {
    kind: "Systems path",
    title: "Backend developer",
    points: ["Databases and SQL in depth", "Processes, threads, concurrency", "Networks and APIs"],
    meta: "sql · os · networks",
  },
  {
    kind: "Web path",
    title: "Full-stack developer",
    points: ["How the browser really works", "APIs, auth and data", "Shipping and deploys"],
    meta: "web · sql · apis",
  },
  {
    kind: "Interface path",
    title: "Frontend developer",
    points: ["The DOM and rendering", "State and data flow", "Accessible interfaces"],
    meta: "js · css · a11y",
  },
  {
    kind: "Data path",
    title: "Data engineer",
    points: ["Storage engines and indexes", "Query planning", "Pipelines at scale"],
    meta: "sql · python · etl",
  },
  {
    kind: "ML path",
    title: "AI engineer",
    points: ["The math under ML", "Python for data", "Systems that serve models"],
    meta: "python · linalg · ml",
  },
];

export function Paths() {
  return (
    <LandingSection labelledBy="paths-title">
      <SectionHeading
        id="paths-title"
        eyebrow="Pick your path"
        title="Choose where to start."
        description="Tell us your goal once. Rookie sequences what to learn and builds your day around it."
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PATHS.map((p) => (
          <li key={p.title} className="landing-reveal">
            <Link
              href="/login"
              className="group flex h-full flex-col rounded-xl border bg-card p-6 transition-all duration-300 outline-none hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-black/[0.06] focus-visible:ring-2 focus-visible:ring-ring/60 dark:hover:shadow-black/40"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{p.kind}</p>
                <ArrowUpRight className="size-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{p.title}</h3>
              <ul className="mt-4 mb-6 space-y-2 text-sm text-muted-foreground">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2.5">
                    <span className="font-mono text-brand" aria-hidden>
                      +
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <p className="mt-auto border-t pt-4 font-mono text-[11px] text-muted-foreground">
                {p.meta}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
