import { LandingSection, SectionHeading } from "./section-heading";

const STEPS = [
  { cmd: "rookie init", title: "Set your goal", body: "Answer three quick questions about where you're headed and what you already know." },
  { cmd: "rookie roadmap", title: "Follow a roadmap", body: "Get a recommended roadmap with sections and topics linked to lessons and courses." },
  { cmd: "rookie today", title: "Work the daily agenda", body: "Each day lists your classes, lessons, problems and revision — in a sensible order." },
  { cmd: "rookie progress", title: "Watch it compound", body: "Streaks, solved problems, attendance and roadmap progress update as you go." },
];

export function HowItWorks() {
  return (
    <LandingSection labelledBy="how-title">
      <SectionHeading id="how-title" eyebrow="How it works" title="Four steps. No guesswork." />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.cmd} className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-semibold text-muted-foreground/50 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <code className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {s.cmd}
              </code>
            </div>
            <h3 className="mt-4 font-medium">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </LandingSection>
  );
}
