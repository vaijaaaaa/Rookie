import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Rookie is free to start. Upgrade for live classes and mentorship, or bring your whole team.",
};

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Everything you need to learn the fundamentals on your own.",
    cta: { label: "Start free", href: "/signup" },
    featured: false,
    features: [
      "All published roadmaps",
      "Course lessons and exercises",
      "Coding practice in Java, Python and JavaScript",
      "Daily agenda, notes and streaks",
      "Progress tracking and achievements",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "per month",
    blurb: "For learners who want structure, live teaching and feedback.",
    cta: { label: "Start with Pro", href: "/signup?plan=pro" },
    featured: true,
    features: [
      "Everything in Free",
      "Live classes with recordings",
      "Assignments reviewed by instructors",
      "Attendance and detailed analytics",
      "Priority access to new roadmaps",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "Custom",
    period: "per seat, billed yearly",
    blurb: "For bootcamps, universities and engineering teams running cohorts.",
    cta: { label: "Contact us", href: "mailto:hello@rookie.dev?subject=Rookie%20for%20teams" },
    featured: false,
    features: [
      "Everything in Pro",
      "Instructor and admin seats",
      "Author your own courses, roadmaps and problems",
      "Cohort dashboards and attendance reports",
      "SSO and onboarding support",
    ],
  },
] as const;

const FAQ = [
  {
    q: "Is the free plan actually free?",
    a: "Yes. Roadmaps, lessons and coding practice are free with no time limit and no card required.",
  },
  {
    q: "Do I need prior programming experience?",
    a: "No. Onboarding asks about your experience and recommends a roadmap that starts at the right level.",
  },
  {
    q: "Which languages can I practice in?",
    a: "Java, Python and JavaScript. You can switch languages per problem.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. You keep Pro until the end of the billing period and your progress always stays with you.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-brand">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Free to learn. Pay for people.</h1>
        <p className="mt-3 text-muted-foreground">
          The curriculum is free. Paid plans add the things that cost us real time: live instructors, reviews and
          cohort tooling.
        </p>
      </header>

      <ul className="mt-12 grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <li
            key={tier.id}
            className={cn(
              "flex flex-col rounded-lg border bg-card p-6",
              tier.featured && "border-brand/50 ring-1 ring-brand/30",
            )}
            aria-labelledby={`tier-${tier.id}`}
          >
            <div className="flex items-center justify-between">
              <h2 id={`tier-${tier.id}`} className="font-mono text-sm font-medium uppercase tracking-wider">
                {tier.name}
              </h2>
              {tier.featured ? <Badge variant="success">Most popular</Badge> : null}
            </div>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">{tier.price}</span>
              <span className="text-sm text-muted-foreground">{tier.period}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{tier.blurb}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 w-full" variant={tier.featured ? "brand" : "outline"}>
              <Link href={tier.cta.href}>{tier.cta.label}</Link>
            </Button>
          </li>
        ))}
      </ul>

      <section aria-labelledby="faq-title" className="mx-auto mt-20 max-w-3xl">
        <h2 id="faq-title" className="text-xl font-semibold tracking-tight">
          Frequently asked
        </h2>
        <dl className="mt-6 divide-y rounded-lg border bg-card">
          {FAQ.map((item) => (
            <div key={item.q} className="p-5">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
